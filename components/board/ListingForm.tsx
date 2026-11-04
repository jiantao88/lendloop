"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, CONDITIONS, CONDITION_LABELS } from "@/lib/domain/types";
import { errorText } from "@/lib/errors";

export type ListingValues = {
  name: string;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number];
  description: string;
};

export function ListingForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ListingValues;
  submitLabel: string;
  onSubmit: (values: ListingValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ListingValues>(
    initial ?? { name: "", category: "garden", condition: "good", description: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        void onSubmit(values)
          .then(() => {
            if (!initial) setValues({ name: "", category: "garden", condition: "good", description: "" });
          })
          .catch((reason: unknown) => {
            setError(errorText(reason));
          })
          .finally(() => setPending(false));
      }}
    >
      <label>
        Name
        <input
          required
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
      </label>
      <label>
        Category
        <select
          value={values.category}
          onChange={(event) =>
            setValues({ ...values, category: event.target.value as ListingValues["category"] })
          }
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Condition
        <select
          value={values.condition}
          onChange={(event) =>
            setValues({ ...values, condition: event.target.value as ListingValues["condition"] })
          }
        >
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {CONDITION_LABELS[condition]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Short description
        <textarea
          required
          value={values.description}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
