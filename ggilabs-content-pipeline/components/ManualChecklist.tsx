"use client";

import { useState } from "react";

export const MANUAL_CHECKS = [
  { key: "checkOpinionInS1", label: "Opinion is explicit and quotable in Section 1" },
  { key: "checkRealExampleSpecific", label: "Real example has 2+ specific details" },
  { key: "checkAllStatsLinked", label: "All stats link to specific source pages, not homepages" },
  { key: "checkExternalLinksCorrect", label: "External links have nofollow and target blank" },
  { key: "checkMetaCapsCorrect", label: "Meta description proper nouns capitalized" },
  { key: "checkCtaSpecific", label: "CTA body is specific to this article topic" },
  { key: "checkParagraphLength", label: "No paragraph exceeds 4 sentences" },
  { key: "checkTableRendersCorrect", label: "Table uses correct inline-styled HTML template" },
  { key: "checkNoForcedHumor", label: "No roofing puns or forced humor" },
  { key: "checkVoiceContractorAware", label: "Voice sounds contractor-aware, not agency generic" },
] as const;

export function manualChecksComplete(article: Record<string, unknown>) {
  return MANUAL_CHECKS.every(({ key }) => article[key] === true);
}

export function ManualChecklist({
  article,
  onSave,
  saving,
}: {
  article: Record<string, unknown>;
  onSave: (checks: Record<string, boolean | number | null | string>) => void;
  saving: boolean;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    MANUAL_CHECKS.forEach(({ key }) => {
      if (typeof article[key] === "boolean") {
        initial[key] = article[key] as boolean;
      }
    });
    return initial;
  });
  const [score, setScore] = useState<number | "">(
    typeof article.overallScore === "number" ? article.overallScore : "",
  );
  const [reviewNotes, setReviewNotes] = useState(
    typeof article.reviewNotes === "string" ? article.reviewNotes : "",
  );

  const allChecked = MANUAL_CHECKS.every(({ key }) => checks[key] === true);

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase text-zinc-500">
        Manual Checks
      </h2>
      <div className="mb-4 flex flex-col gap-2">
        {MANUAL_CHECKS.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={checks[key] === true}
              onChange={(event) =>
                setChecks({ ...checks, [key]: event.target.checked })
              }
              className="mt-1 shrink-0"
            />
            <span className="text-zinc-700">{label}</span>
          </label>
        ))}
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
          Score
        </span>
        <input
          type="number"
          min={1}
          max={10}
          value={score}
          onChange={(event) =>
            setScore(event.target.value === "" ? "" : Number(event.target.value))
          }
          className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
          Review Notes
        </span>
        <textarea
          value={reviewNotes}
          onChange={(event) => setReviewNotes(event.target.value)}
          rows={4}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onSave({
            ...checks,
            overallScore: score === "" ? null : score,
            reviewNotes,
            status: "reviewed",
          })
        }
        disabled={saving}
        className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Checklist"}
      </button>

      {!allChecked && (
        <p className="mt-2 text-xs text-amber-700">
          Complete all checks before approving.
        </p>
      )}
    </section>
  );
}
