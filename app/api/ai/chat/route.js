import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { SYNA_SYSTEM_CONTEXT } from "@/lib/synaContext";
import { generateImage, isImageRequest } from "@/lib/cloudflareImage";
import { generateTextReply } from "@/lib/cloudflareText";

// Cap attached file size (base64) so one image can't bloat a request or
// the database it eventually gets persisted into via /api/ai/conversations.
const MAX_ATTACHMENT_LENGTH = 5_500_000; // ~4MB actual file

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 15_000;

function partsForMessage(m) {
  const parts = [];
  // Defensive: older persisted conversations may contain a message
  // whose `text` is itself an object (from a pre-fix bug where a full
  // reply object got saved instead of its text). Unwrap that instead
  // of sending it to Gemini as-is, which 400s the whole request.
  const text = typeof m.text === "string" ? m.text : (typeof m.text?.text === "string" ? m.text.text : "");
  if (text) parts.push({ text });
  if (m.attachment?.dataUrl) {
    const match = m.attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  return parts.length > 0 ? parts : [{ text: "" }];
}

function roleForGemini(role) {
  return role === "assistant" ? "model" : "user";
}

// Wraps the Gemini call with a timeout and tags rate-limit/server/timeout
// failures so the caller knows it's safe to fall back to Cloudflare, as
// opposed to a genuine bad-request error (e.g. bad model name, malformed
// content) that retrying elsewhere won't fix.
async function callGemini(contents, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYNA_SYSTEM_CONTEXT }] },
        }),
        signal: controller.signal,
      }
    );

    // 429 (rate limited) and any 5xx (Gemini-side server error, e.g. 503
    // overloaded) are treated as transient — fall back to Cloudflare.
    // 4xx other than 429 (bad model name, malformed request, etc.) is a
    // real bug that falling back won't fix, so it's left to fail loudly.
    if (res.status === 429 || res.status >= 500) {
      const detail = await res.text().catch(() => "");
      console.error(`Gemini error ${res.status} (falling back):`, detail);
      const err = new Error(res.status === 429 ? "Gemini rate limited" : "Gemini server error");
      err.fallback = true;
      throw err;
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Gemini error ${res.status}:`, detail);
      const err = new Error("Gemini request failed");
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!replyText) {
      const err = new Error("Gemini returned no text");
      throw err;
    }

    return replyText;
  } catch (err) {
    if (err.name === "AbortError") {
      const timeoutErr = new Error("Gemini timed out");
      timeoutErr.fallback = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];

  if (lastMessage.attachment?.dataUrl && lastMessage.attachment.dataUrl.length > MAX_ATTACHMENT_LENGTH) {
    return NextResponse.json({ error: "That attachment is too large. Please use a smaller file." }, { status: 400 });
  }

  // Image generation branch: if the latest user message reads like a
  // "draw me a..." request, skip the chat model entirely and hand back
  // a generated image instead of a text reply.
  if (lastMessage.role !== "assistant" && isImageRequest(lastMessage.text)) {
    try {
      const dataUrl = await generateImage(lastMessage.text);
      return NextResponse.json({
        reply: {
          role: "assistant",
          text: "Here's what I generated:",
          attachment: { dataUrl, name: "generated-image.jpg" },
        },
      });
    } catch (err) {
      return NextResponse.json({
        reply: { role: "assistant", text: err.message || "Image generation failed. Please try again." },
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat isn't set up yet. Add GEMINI_API_KEY in Render's Environment tab." },
      { status: 500 }
    );
  }

  const contents = messages.map((m) => ({
    role: roleForGemini(m.role),
    parts: partsForMessage(m),
  }));

  try {
    const replyText = await callGemini(contents, apiKey);
    return NextResponse.json({
      reply: { role: "assistant", text: replyText, usedFallback: false },
    });
  } catch (err) {
    if (err.fallback) {
      // Gemini is rate-limited, had a server error, or timed out — fall
      // back to Cloudflare Workers AI so Syna can still reply.
      console.error("Gemini unavailable, falling back to Cloudflare:", err.message);
      try {
        const fallbackText = await generateTextReply(messages, SYNA_SYSTEM_CONTEXT);
        return NextResponse.json({
          reply: { role: "assistant", text: fallbackText, usedFallback: true },
        });
      } catch (fallbackErr) {
        console.error("Cloudflare fallback also failed:", fallbackErr);
        return NextResponse.json(
          { error: "Syna couldn't respond right now. Please try again." },
          { status: 502 }
        );
      }
    }

    console.error("POST /api/ai/chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}