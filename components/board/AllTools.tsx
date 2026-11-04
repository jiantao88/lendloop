"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorText } from "@/lib/errors";
import { CATEGORIES, CATEGORY_LABELS, CONDITION_LABELS, type Category, type Condition } from "@/lib/domain/types";
import { StatusPill } from "./StatusPill";

export function AllTools() {
  const [category, setCategory] = useState<"" | Category>("");
  const tools = useQuery(api.tools.list, category ? { category } : {});

  return (
    <section>
      <h1>All tools</h1>
      <label className="filter">
        Category
        <select value={category} onChange={(event) => setCategory(event.target.value as "" | Category)}>
          <option value="">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {CATEGORY_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      {tools === undefined ? <p className="meta">Loading tools…</p> : null}
      {tools && tools.length === 0 ? <p className="meta">Nothing in this category yet.</p> : null}
      <div className="stack">
        {tools?.map((tool) => (
          <article className="card" key={tool.id}>
            <div className="row">
              <h2>{tool.name}</h2>
              <StatusPill value={tool.availability} />
            </div>
            <p className="meta">
              {CATEGORY_LABELS[tool.category as Category]} · {CONDITION_LABELS[tool.condition as Condition]}
            </p>
            <p>{tool.description}</p>
            <p className="meta">
              {tool.ownerName}
              {tool.trustedLender ? <span className="trusted"> · Trusted lender</span> : null}
            </p>
            {tool.isOwner ? (
              <p className="meta">This is your listing.</p>
            ) : (
              <RequestBox toolId={tool.id} disabled={tool.availability === "on_loan" || tool.availability === "overdue" || tool.availability === "reserved"} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function RequestBox({ toolId, disabled }: { toolId: Id<"tools">; disabled: boolean }) {
  const request = useMutation(api.loans.request);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        void request({ toolId, startDate, endDate })
          .then(() => {
            setStartDate("");
            setEndDate("");
          })
          .catch((reason: unknown) => setError(errorText(reason)))
          .finally(() => setPending(false));
      }}
    >
      <label>
        From
        <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      </label>
      <label>
        Until
        <input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button type="submit" disabled={disabled || pending}>
          {disabled ? "Unavailable" : pending ? "Requesting…" : "Request to borrow"}
        </button>
      </div>
    </form>
  );
}
