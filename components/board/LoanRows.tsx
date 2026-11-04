"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorText } from "@/lib/errors";
import { Activity } from "./Activity";
import { StatusPill } from "./StatusPill";
import { useState } from "react";

type LoanRow = {
  id: Id<"loans">;
  toolName: string;
  startDate: string;
  endDate: string;
  status: string;
  counterpartyName: string;
  lenderName?: string;
};

export function MyRequests() {
  const loans = useQuery(api.loans.mine, {});
  return (
    <LoanSection
      title="My requests"
      empty="You have not asked to borrow anything yet."
      loans={loans}
      mode="borrower"
    />
  );
}

export function IncomingRequests() {
  const loans = useQuery(api.loans.incoming, {});
  return (
    <LoanSection
      title="Incoming requests"
      empty="Nobody has asked to borrow your tools yet."
      loans={loans}
      mode="lender"
    />
  );
}

function LoanSection({
  title,
  empty,
  loans,
  mode,
}: {
  title: string;
  empty: string;
  loans: LoanRow[] | undefined;
  mode: "borrower" | "lender";
}) {
  return (
    <section className="stack">
      <h1>{title}</h1>
      {loans === undefined ? <p className="meta">Loading requests…</p> : null}
      {loans && loans.length === 0 ? <p className="meta">{empty}</p> : null}
      {loans?.map((loan) => (
        <LoanCard key={loan.id} loan={loan} mode={mode} />
      ))}
    </section>
  );
}

function LoanCard({ loan, mode }: { loan: LoanRow; mode: "borrower" | "lender" | "admin" }) {
  const decide = useMutation(api.loans.decide);
  const cancel = useMutation(api.loans.cancel);
  const markReturned = useMutation(api.loans.markReturned);
  const [error, setError] = useState<string | null>(null);

  function run(action: Promise<unknown>) {
    setError(null);
    void action.catch((reason: unknown) => setError(errorText(reason)));
  }

  return (
    <article className="card">
      <div className="row">
        <h2>{loan.toolName}</h2>
        <StatusPill value={loan.status} />
      </div>
      <p className="meta">
        {loan.startDate} to {loan.endDate}
        {mode === "admin" ? ` · ${loan.lenderName} lent to ${loan.counterpartyName}` : ` · ${loan.counterpartyName}`}
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        {mode === "lender" && loan.status === "pending" ? (
          <>
            <button type="button" onClick={() => run(decide({ loanId: loan.id, decision: "approved" }))}>
              Approve
            </button>
            <button className="secondary" type="button" onClick={() => run(decide({ loanId: loan.id, decision: "declined" }))}>
              Decline
            </button>
          </>
        ) : null}
        {mode === "borrower" && loan.status === "pending" ? (
          <button className="secondary" type="button" onClick={() => run(cancel({ loanId: loan.id }))}>
            Cancel request
          </button>
        ) : null}
        {loan.status === "approved" && mode !== "admin" ? (
          <button type="button" onClick={() => run(markReturned({ loanId: loan.id }))}>
            Mark returned
          </button>
        ) : null}
      </div>
      <Activity loanId={loan.id} />
    </article>
  );
}

export function AdminLoans() {
  const loans = useQuery(api.loans.all, {});
  return (
    <div className="stack">
      {loans === undefined ? <p className="meta">Loading loans…</p> : null}
      {loans && loans.length === 0 ? <p className="meta">No loans yet.</p> : null}
      {loans?.map((loan) => (
        <LoanCard key={loan.id} loan={loan} mode="admin" />
      ))}
    </div>
  );
}
