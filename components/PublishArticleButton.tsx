"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function minimumLocalSchedule() {
  const date = new Date(Date.now() + 60_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function PublishArticleButton({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"draft" | "publish" | "schedule">("draft");
  const [scheduledAt, setScheduledAt] = useState("");

  async function publish() {
    if (mode === "schedule" && !scheduledAt) {
      setError("Choose a date and time.");
      return;
    }
    if (mode === "publish" && !window.confirm("Publish this article live now?")) return;
    setPublishing(true);
    setError("");

    const res = await fetch(`/api/publish/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined }),
    });
    const json = await res.json();

    setPublishing(false);

    if (!res.ok) {
      setError(json.detail ?? json.error ?? "Publish failed");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex max-w-72 flex-col items-end gap-2">
      <div className="flex gap-2">
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="rounded border border-zinc-300 bg-white px-2 py-2 text-sm">
          <option value="draft">Save as draft</option>
          <option value="publish">Publish now</option>
          <option value="schedule">Schedule</option>
        </select>
        {mode === "schedule" && <input type="datetime-local" value={scheduledAt} min={minimumLocalSchedule()} onChange={(event) => setScheduledAt(event.target.value)} className="min-w-48 rounded border border-zinc-300 px-2 py-2 text-sm" />}
      </div>
      <button
        type="button"
        disabled={publishing}
        onClick={() => void publish()}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {publishing ? "Sending..." : mode === "publish" ? "Publish now" : mode === "schedule" ? "Schedule in WordPress" : "Save WordPress draft"}
      </button>
      {error && <p className="max-w-64 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
