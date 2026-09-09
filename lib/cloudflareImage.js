// Free image generation via Cloudflare Workers AI (FLUX.1 Schnell).
export async function generateImage(prompt) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Image generation is not set up yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Render's Environment tab."
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Cloudflare image error ${res.status}:`, detail);
    throw new Error("Image generation failed. Please try again.");
  }

  const data = await res.json();
  const base64 = data?.result?.image || data?.image;

  if (!base64) {
    throw new Error("Image generation failed. Please try again.");
  }

  return `data:image/jpeg;base64,${base64}`;
}

// Simple heuristic to detect when someone's asking Syna to draw/generate an image.
export function isImageRequest(text) {
  if (!text) return false;
  return /\b(generate|create|draw|make|design|paint)\b[\s\S]{0,25}\b(image|picture|photo|drawing|art|illustration|logo|icon|artwork)\b/i.test(
    text
  );
}