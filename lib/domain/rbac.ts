import type { LoanStatus, Role } from "./types";

export type Actor = { id: string; role: Role };

export type LoanParties = {
  lenderId: string;
  borrowerId: string;
  status: LoanStatus;
};

export function canEditListing(actor: Actor, ownerId: string): boolean {
  return actor.id === ownerId;
}

export function canRemoveListing(actor: Actor, ownerId: string): boolean {
  return actor.role === "admin" || actor.id === ownerId;
}

export function canViewAllLoans(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canMarkTrusted(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canViewLoan(actor: Actor, loan: LoanParties): boolean {
  return (
    actor.role === "admin" ||
    actor.id === loan.lenderId ||
    actor.id === loan.borrowerId
  );
}

export function canDecideRequest(actor: Actor, loan: LoanParties): boolean {
  return loan.status === "pending" && actor.id === loan.lenderId;
}

export function canCancelRequest(actor: Actor, loan: LoanParties): boolean {
  return loan.status === "pending" && actor.id === loan.borrowerId;
}

export function canMarkReturned(actor: Actor, loan: LoanParties): boolean {
  return (
    loan.status === "approved" &&
    (actor.id === loan.lenderId || actor.id === loan.borrowerId)
  );
}
