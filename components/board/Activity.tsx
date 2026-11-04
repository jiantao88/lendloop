"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activityLine } from "@/lib/domain/notify";

export function Activity({ loanId }: { loanId: Id<"loans"> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="activity">
      <button className="secondary" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide activity" : "Activity"}
      </button>
      {open ? <ActivityList loanId={loanId} /> : null}
    </div>
  );
}

function ActivityList({ loanId }: { loanId: Id<"loans"> }) {
  const events = useQuery(api.automation.forLoan, { loanId });
  if (events === undefined) return <p className="meta">Loading activity…</p>;
  if (events.length === 0) return <p className="meta">No automation activity yet.</p>;
  const now = Date.now();
  return (
    <ul>
      {events.map((event) => (
        <li key={`${event.kind}:${event.createdAt}:${event.summary}`}>
          {activityLine(event.summary, event.createdAt, now)}
        </li>
      ))}
    </ul>
  );
}
