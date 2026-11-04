const encoder = new TextEncoder();

export const SIGNATURE_SKEW_MS = 5 * 60 * 1000;

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sortValue(item));
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (record[key] !== undefined) sorted[key] = sortValue(record[key]);
  }
  return sorted;
}

export async function signPayload(
  secret: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return bufferToHex(signature);
}

export async function verifySignature(input: {
  secret: string;
  timestamp: string;
  signature: string;
  body: string;
  now: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!input.secret) return { ok: false, reason: "Webhook secret is not configured" };
  if (!/^\d+$/.test(input.timestamp)) {
    return { ok: false, reason: "Invalid signature" };
  }
  const skew = Math.abs(input.now - Number(input.timestamp));
  if (!Number.isFinite(skew) || skew > SIGNATURE_SKEW_MS) {
    return { ok: false, reason: "Invalid signature" };
  }
  const expected = await signPayload(input.secret, input.timestamp, input.body);
  if (!timingSafeEqualHex(expected, input.signature.trim().toLowerCase())) {
    return { ok: false, reason: "Invalid signature" };
  }
  return { ok: true };
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}
