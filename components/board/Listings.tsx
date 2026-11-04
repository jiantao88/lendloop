"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorText } from "@/lib/errors";
import { CATEGORY_LABELS, type Category } from "@/lib/domain/types";
import { ListingForm, type ListingValues } from "./ListingForm";

export function Listings() {
  const tools = useQuery(api.tools.mine, {});
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);

  return (
    <section className="stack">
      <h1>My listings</h1>
      <article className="panel">
        <h2>List a tool</h2>
        <ListingForm
          submitLabel="Publish listing"
          onSubmit={async (values) => {
            try {
              await create(values);
            } catch (error) {
              throw new Error(errorText(error));
            }
          }}
        />
      </article>
      {tools === undefined ? <p className="meta">Loading your listings…</p> : null}
      {tools && tools.length === 0 ? <p className="meta">You have not listed a tool yet.</p> : null}
      {tools?.map((tool) => (
        <EditableListing
          key={tool.id}
          tool={tool}
          onUpdate={async (values) => {
            try {
              await update({ toolId: tool.id, ...values });
            } catch (error) {
              throw new Error(errorText(error));
            }
          }}
          onRemove={async () => {
            try {
              await remove({ toolId: tool.id });
            } catch (error) {
              throw new Error(errorText(error));
            }
          }}
        />
      ))}
    </section>
  );
}

function EditableListing({
  tool,
  onUpdate,
  onRemove,
}: {
  tool: ListingValues & { id: Id<"tools"> };
  onUpdate: (values: ListingValues) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <article className="card">
      <div className="row">
        <h2>{tool.name}</h2>
        <span className="pill">{CATEGORY_LABELS[tool.category as Category]}</span>
      </div>
      {editing ? (
        <ListingForm initial={tool} submitLabel="Save changes" onSubmit={onUpdate} />
      ) : (
        <p>{tool.description}</p>
      )}
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button className="secondary" type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? "Close editor" : "Edit"}
        </button>
        <button
          className="danger"
          type="button"
          onClick={() => {
            setError(null);
            void onRemove().catch((reason: unknown) => setError(errorText(reason)));
          }}
        >
          Remove listing
        </button>
      </div>
    </article>
  );
}
