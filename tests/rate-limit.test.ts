import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T12:00:00.000Z"));
    globalThis.__trippingRateLimitStore?.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.__trippingRateLimitStore?.clear();
  });

  it("allows requests up to the limit, then blocks", () => {
    const options = { key: "member-1", limit: 2, windowMs: 3_000 };
    expect(checkRateLimit(options)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit(options)).toMatchObject({ allowed: true, remaining: 0 });
    expect(checkRateLimit(options)).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 3,
    });
  });

  it("resets the limit after the window expires", () => {
    const options = { key: "member-2", limit: 1, windowMs: 5_000 };
    checkRateLimit(options);
    expect(checkRateLimit(options).allowed).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(checkRateLimit(options)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("isolates buckets by key", () => {
    const options = { limit: 1, windowMs: 10_000 };
    checkRateLimit({ ...options, key: "member-a" });
    expect(checkRateLimit({ ...options, key: "member-a" }).allowed).toBe(false);
    expect(checkRateLimit({ ...options, key: "member-b" }).allowed).toBe(true);
  });
});
