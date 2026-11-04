"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorText } from "@/lib/errors";
import { activityLine } from "@/lib/domain/notify";
import { AdminLoans } from "./LoanRows";
import { useState } from "react";

export function Admin() {
  const me = useQuery(api.users.me, {});
  if (me === undefined) return <p className="meta">Loading…</p>;
  if (!me || me.role !== "admin") return <p className="banner">This page is for admins.</p>;
  return (
    <section className="stack">
      <h1>Admin</h1>
      <TrustedLenders />
      <AnyListing />
      <h2>All loans</h2>
      <AdminLoans />
      <Errors />
    </section>
  );
}

function TrustedLenders() {
  const users = useQuery(api.users.listForAdmin, {});
  const setTrusted = useMutation(api.users.setTrusted);
  const [error, setError] = useState<string | null>(null);
  return (
    <article className="panel">
      <h2>Trusted lenders</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="stack">
        {users?.map((user) => (
          <div className="row" key={user.id}>
            <span>
              {user.name} <span className="meta">{user.email}</span>
            </span>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setError(null);
                void setTrusted({ userId: user.id, trustedLender: !user.trustedLender }).catch((reason: unknown) =>
                  setError(errorText(reason)),
                );
              }}
            >
              {user.trustedLender ? "Remove trusted lender" : "Mark trusted lender"}
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function AnyListing() {
  const tools = useQuery(api.tools.list, {});
  const remove = useMutation(api.tools.remove);
  const [error, setError] = useState<string | null>(null);
  return (
    <article className="panel">
      <h2>Remove any listing</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="stack">
        {tools?.map((tool) => (
          <div className="row" key={tool.id}>
            <span>
              {tool.name} <span className="meta">{tool.ownerName}</span>
            </span>
            <button
              className="danger"
              type="button"
              onClick={() => {
                setError(null);
                void remove({ toolId: tool.id as Id<"tools"> }).catch((reason: unknown) =>
                  setError(errorText(reason)),
                );
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function Errors() {
  const events = useQuery(api.automation.recentErrors, {});
  const now = Date.now();
  return (
    <article className="panel">
      <h2>Automation failures</h2>
      {events && events.length === 0 ? <p className="meta">No failed workflow runs are recorded.</p> : null}
      <ul>
        {events?.map((event) => (
          <li key={`${event.createdAt}:${event.summary}`}>{activityLine(event.summary, event.createdAt, now)}</li>
        ))}
      </ul>
    </article>
  );
}
