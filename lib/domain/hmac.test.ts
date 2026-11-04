import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  isRetryableStatus,
  signPayload,
  verifySignature,
} from "./hmac";

describe("canonicalJson", () => {
  it("sorts keys and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: true, c: undefined } })).toBe('{"a":{"d":true},"b":1}');
  });
});

describe("hmac", () => {
  const secret = "test-secret";
  const body = canonicalJson({ loanId: "abc", status: "pending" });

  it("accepts a fresh signature", async () => {
    const timestamp = "1700000000000";
    const signature = await signPayload(secret, timestamp, body);
    const result = await verifySignature({
      secret,
      timestamp,
      signature,
      body,
      now: 1700000000000,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a tampered body, a stale timestamp, and a wrong secret", async () => {
    const timestamp = "1700000000000";
    const signature = await signPayload(secret, timestamp, body);
    expect(
      await verifySignature({
        secret,
        timestamp,
        signature,
        body: canonicalJson({ loanId: "zzz", status: "pending" }),
        now: 1700000000000,
      }),
    ).toEqual({ ok: false, reason: "Invalid signature" });
    expect(
      await verifySignature({
        secret,
        timestamp,
        signature,
        body,
        now: 1700000000000 + 6 * 60 * 1000,
      }),
    ).toEqual({ ok: false, reason: "Invalid signature" });
    expect(
      await verifySignature({
        secret: "other",
        timestamp,
        signature,
        body,
        now: 1700000000000,
      }),
    ).toEqual({ ok: false, reason: "Invalid signature" });
  });

  it("classifies retryable HTTP statuses", () => {
    expect(isRetryableStatus(0)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
  });
});
