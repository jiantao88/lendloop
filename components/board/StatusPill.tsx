const LABELS: Record<string, string> = {
  available: "Available",
  requested: "Requested",
  reserved: "Reserved",
  on_loan: "On loan",
  overdue: "Overdue",
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function StatusPill({ value }: { value: string }) {
  return <span className={`pill ${value}`}>{LABELS[value] ?? value}</span>;
}
