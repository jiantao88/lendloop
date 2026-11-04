import { describe, expect, it } from "vitest";
import {
  alreadyRecorded,
  availabilityOf,
  hasApprovedOverlap,
  isOverdue,
  isPubliclyAvailable,
  reminderKey,
  validateDateRange,
  validateListing,
} from "./loans";

describe("listings and loans", () => {
  it("validates listing text and known categories", () => {
    expect(
      validateListing({
        name: "  Cordless drill  ",
        category: "power_tools",
        condition: "good",
        description: " Two batteries. ",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Cordless drill",
        category: "power_tools",
        condition: "good",
        description: "Two batteries.",
      },
    });
    expect(validateListing({ name: "A", category: "nope", condition: "good", description: "x" }).ok).toBe(
      false,
    );
  });

  it("rejects inverted dates and overlapping approvals", () => {
    expect(validateDateRange("2026-05-02", "2026-05-01")).toEqual({
      ok: false,
      reason: "End date is before the start date",
    });
    const existing = [
      { id: "1", status: "approved" as const, startDate: "2026-05-01", endDate: "2026-05-04" },
      { id: "2", status: "pending" as const, startDate: "2026-05-01", endDate: "2026-05-02" },
    ];
    expect(hasApprovedOverlap(existing, "2026-05-04", "2026-05-06")).toBe(true);
    expect(hasApprovedOverlap(existing, "2026-05-05", "2026-05-06")).toBe(false);
  });

  it("derives availability, public listing, and overdue state", () => {
    const approved = [
      { status: "approved" as const, startDate: "2026-05-01", endDate: "2026-05-03" },
    ];
    expect(availabilityOf(approved, "2026-05-02")).toBe("on_loan");
    expect(availabilityOf(approved, "2026-05-04")).toBe("overdue");
    expect(isPubliclyAvailable(approved, "2026-05-02")).toBe(false);
    expect(
      isPubliclyAvailable(
        [{ status: "pending", startDate: "2026-05-01", endDate: "2026-05-02" }],
        "2026-05-02",
      ),
    ).toBe(true);
    expect(isOverdue(approved[0], "2026-05-04")).toBe(true);
    expect(isOverdue(approved[0], "2026-05-03")).toBe(false);
  });

  it("builds a stable reminder key and treats repeats as already recorded", () => {
    const key = reminderKey("loan1", "2026-05-04");
    expect(key).toBe("overdue:loan1:2026-05-04");
    expect(alreadyRecorded([key], key)).toBe(true);
    expect(alreadyRecorded([key], reminderKey("loan1", "2026-05-05"))).toBe(false);
  });
});
