type Item = { id: string; message: string };
type Result = { errors?: Item[]; warnings?: Item[]; passes?: Item[] };

export function TechnicalSeoPanel({ result }: { result?: Result }) {
  if (!result) return null;
  const groups = [
    { label: "Errors", items: result.errors ?? [], color: "text-red-700" },
    { label: "Warnings", items: result.warnings ?? [], color: "text-amber-700" },
    { label: "Passed", items: result.passes ?? [], color: "text-emerald-700" },
  ];
  return <div><h2 className="mb-2 text-sm font-semibold">Technical SEO</h2>{groups.map((group) => group.items.length ? <details key={group.label} open={group.label !== "Passed"} className="mb-2"><summary className={`cursor-pointer text-xs font-semibold ${group.color}`}>{group.label} ({group.items.length})</summary><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-zinc-600">{group.items.map((item) => <li key={`${group.label}-${item.id}`}>{item.message}</li>)}</ul></details> : null)}</div>;
}
