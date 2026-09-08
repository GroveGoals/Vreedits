import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { SYNA_SYSTEM_CONTEXT } from "@/lib/synaContext";
import { generateImage, isImageRequest } from "@/lib/cloudflareImage";

// Cap attached file size (base64) so one image can't bloat a request or
// the database it eventually gets persisted into via /api/ai/conversations.
const MAX_ATTACHMENT_LENGTH = 5_500_000; // ~4MB actual file

function partsForMessage(m) {
  const parts = [];
  if (m.text) parts.push({ text: m.text });
  if (m.attachment?.dataUrl) {
    const match = m.attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  return parts.length > 0 ? parts : [{