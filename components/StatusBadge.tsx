const colors: Record<string, string> = {
  uploaded: "bg-amber-100 text-amber-800 ring-amber-200",
  reviewed: "bg-sky-100 text-sky-800 ring-sky-200",
  approved: "bg-lime-100 text-lime-800 ring-lime-200",
  published: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  flagged: "bg-red-100 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        colors[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"
      }`}
    >
      {status}
    </span>
  );
}
