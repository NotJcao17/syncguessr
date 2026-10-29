import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Rounds travel as encrypted tokens so the Deezer id (and with it the answer) never reaches the browser.
// Set SYNCGUESSR_SECRET in production; the fallback keeps local development working.
const KEY = createHash("sha256")
  .update(process.env.SYNCGUESSR_SECRET ?? "syncguessr-local-secret")
  .digest();

export function sealTrackId(trackId: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const body = Buffer.concat([cipher.update(String(trackId), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openTrackToken(token: unknown): number | null {
  if (typeof token !== "string" || token.length < 30 || token.length > 200) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const id = Number(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
