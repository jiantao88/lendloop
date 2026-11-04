function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sortValue(item));
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) sorted[key] = sortValue(value[key]);
  }
  return sorted;
}

function signPayload(secret, timestamp, body) {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

function requireSecret() {
  const secret = $env.LENDLOOP_WEBHOOK_SECRET;
  if (!secret) throw new Error("LENDLOOP_WEBHOOK_SECRET is not set");
  return secret;
}
