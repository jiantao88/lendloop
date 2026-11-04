import { describe, expect, it } from "vitest";
import {
  canCancelRequest,
  canDecideRequest,
  canEditListing,
  canMarkReturned,
  canMarkTrusted,
  canRemoveListing,
  canViewAllLoans,
  canViewLoan,
} from "./rbac";

const lender = { id: "lender", role: "user" as const };
const borrower = { id: "borrower", role: "user" as const };
const admin = { id: "admin", role: "admin" as const };
const pending = { lenderId: "lender", borrowerId: "borrower", status: "pending" as const };
const approved = { ...pending, status: "approved" as const };

describe("rbac", () => {
  it("lets a neighbor edit and remove only their own listing", () => {
    expect(canEditListing(lender, "lender")).toBe(true);
    expect(canEditListing(lender, "borrower")).toBe(false);
    expect(canEditListing(admin, "lender")).toBe(false);
    expect(canRemoveListing(lender, "lender")).toBe(true);
    expect(canRemoveListing(lender, "borrower")).toBe(false);
    expect(canRemoveListing(admin, "borrower")).toBe(true);
  });

  it("limits request actions to the people involved", () => {
    expect(canDecideRequest(lender, pending)).toBe(true);
    expect(canDecideRequest(borrower, pending)).toBe(false);
    expect(canDecideRequest(admin, pending)).toBe(false);
    expect(canCancelRequest(borrower, pending)).toBe(true);
    expect(canCancelRequest(lender, pending)).toBe(false);
    expect(canMarkReturned(lender, approved)).toBe(true);
    expect(canMarkReturned(borrower, approved)).toBe(true);
    expect(canMarkReturned(admin, approved)).toBe(false);
    expect(canMarkReturned(lender, pending)).toBe(false);
  });

  it("lets admins see every loan and mark trusted lenders", () => {
    expect(canViewAllLoans(admin)).toBe(true);
    expect(canViewAllLoans(lender)).toBe(false);
    expect(canMarkTrusted(admin)).toBe(true);
    expect(canMarkTrusted(lender)).toBe(false);
    expect(canViewLoan(admin, pending)).toBe(true);
    expect(canViewLoan(borrower, pending)).toBe(true);
    expect(canViewLoan({ id: "stranger", role: "user" }, pending)).toBe(false);
  });
});
