import { AUTO_CHECK_KEYS, autoCheckLabel } from "@/lib/checker";

export function AutoCheckResults({
  article,
}: {
  article: Record<string, unknown>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase text-zinc-500">
        Automated Checks
      </h2>
      <div className="flex flex-col gap-2">
        {AUTO_CHECK_KEYS.map((key) => {
          const passed = article[key] === true;
          const failed = article[key] === false;

          return (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${
                  passed ? "bg-emerald-500" : failed ? "bg-red-500" : "bg-zinc-300"
                }`}
              />
              <span className={failed ? "text-red-700" : "text-zinc-700"}>
                {autoCheckLabel(key)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
