// Fallback reply via Cloudflare Workers AI, used when Gemini is
// rate-limited (429) or times out. Uses the vision-capable Llama 3.2
// model so it can still read an attached image, not just text —
// weaker than Gemini, but keeps Syna responsive while Gemini recovers.
//
// One-time setup: the first call to this model requires accepting
// Meta's license for it in the Cloudflare dashboard (Workers AI →
// this model's page) — it 403s until that's done once per account.

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function contentForMessage(m) {
  const content = [];
  if (m.text) content.push({ type: "text", text: m.text });
  if (m.attachment?.dataUrl && m.attachment.type?.startsWith("image/")) {
    content.push({ type: "image_url", image_url: { url: m.attachment.dataUrl } });
  }
  // Non-image attachments (PDFs, docs) aren't supported by this model —
  // they're silently dropped rather than sent as unreadable content.
  return content.length > 0 ? content : [{ type: "text", text: "" }];
}

export async function generateTextReply(messages, systemPrompt) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Fallback reply isn't set up. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Render's Environment tab."
    );
  }

  const cfMessages = [
    { role: "system", content: systemPrompt },
    ...messages
      .filter((m) => m.text || m.attachment?.dataUrl)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: contentForMessage(m),
      })),
  ];

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${VISION_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: cfMessages }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Cloudflare fallback error ${res.status}:`, detail);
    throw new Error("Syna couldn't respond right now. Please try again.");
  }

  const data = await res.json();
  const text = data?.result?.response;

  if (!text) {
    throw new Error("Syna couldn't respond right now. Please try again.");
  }

  return text;
}
