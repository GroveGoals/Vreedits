import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { SYNA_SYSTEM_CONTEXT } from "@/lib/synaContext";
import { generateImage, isImageRequest } from "@/lib/cloudflareImage";

// Cap attached file size (base64) so one image can't bloat a request or
// the database it eventually gets persisted into via /api/ai/conversations.
const MAX_ATTACHMENT_LENGTH = 5_500_000; // ~4MB actual file

const GEMINI_MODEL = "gemini-1.5-flash";

function partsForMessage(m) {
  const parts = [];
  if (m.text) parts.push({ text: m.text });
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYNA_SYSTEM_CONTEXT }] },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Gemini error ${res.status}:`, detail);
      return NextResponse.json({ error: "Syna couldn't respond right now. Please try again." }, { status: 502 });
    }

    const data = await res.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!replyText) {
      return NextResponse.json({ error: "Syna didn't return a response. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ reply: { role: "assistant", text: replyText } });
  } catch (err) {
    console.error("POST /api/ai/chat error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}