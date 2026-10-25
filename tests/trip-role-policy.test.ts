import { describe, expect, it } from "vitest";
import { canEdit, canManage, hasAtLeast } from "../src/lib/trip-role-policy";

describe("trip role policy", () => {
  it("denies all actions to non-members", () => {
    expect(canEdit(null)).toBe(false);
    expect(canManage(null)).toBe(false);
    expect(hasAtLeast(null, "viewer")).toBe(false);
  });

  it("allows viewers to read but not mutate or manage", () => {
    expect(hasAtLeast("viewer", "viewer")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canManage("viewer")).toBe(false);
  });

  it("allows editors to edit but not manage members", () => {
    expect(canEdit("editor")).toBe(true);
    expect(canManage("editor")).toBe(false);
    expect(hasAtLeast("editor", "owner")).toBe(false);
  });

  it("allows owners all role-gated operations", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canManage("owner")).toBe(true);
    expect(hasAtLeast("owner", "viewer")).toBe(true);
    expect(hasAtLeast("owner", "editor")).toBe(true);
    expect(hasAtLeast("owner", "owner")).toBe(true);
  });
});
