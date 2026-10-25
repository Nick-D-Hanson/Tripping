import { describe, expect, it } from "vitest";
import { dayKey, fmtDate } from "../src/lib/dates";
import { initialsFromValue, cn } from "../src/lib/utils";
import { getClientIp, getRequestId } from "../src/lib/observability";

describe("display utilities", () => {
  it("handles names, emails, and missing identities", () => {
    expect(initialsFromValue("Nick Hanson")).toBe("NH");
    expect(initialsFromValue("sam.hanson@example.com")).toBe("SH");
    expect(initialsFromValue(" ")).toBe("?");
    expect(initialsFromValue(null)).toBe("?");
  });

  it("combines classes without conflicting Tailwind spacing tokens", () => {
    expect(cn("px-2", false, "px-4")).toBe("px-4");
  });

  it("produces consistent date-only keys", () => {
    expect(dayKey("2026-10-25")).toBe("2026-10-25");
    expect(fmtDate(null)).toBe("Not set");
  });
});

describe("request metadata", () => {
  it("uses the first proxy-forwarded IP when supplied", () => {
    const headers = new Headers({
      "x-forwarded-for": "192.0.2.1, 198.51.100.4",
      "x-real-ip": "198.51.100.8",
    });
    expect(getClientIp(headers)).toBe("192.0.2.1");
  });

  it("uses fallback headers and request IDs", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe("203.0.113.8");
    expect(getRequestId(new Headers({ "x-request-id": "request-123" }))).toBe("request-123");
  });
});
