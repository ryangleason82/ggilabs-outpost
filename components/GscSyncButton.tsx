"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GscSyncButtonProps = {
  articleId?: string;
  compact?: boolean;
};

export function GscSyncButton({ articleId, compact = false }: GscSyncButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function sync() {
    setSyncing(true);
    setError("");

    const res = await fetch(
      articleId ? `/api/articles/${articleId}/gsc` : "/api/gsc/sync",
      { method: "POST" },
    );
    const json = await res.json();
    setSyncing(false);

    if (!res.ok) {
      setError(json.detail ?? json.error ?? "GSC sync failed");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={syncing}
        onClick={() => void sync()}
        className={
          compact
            ? "rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
            : "rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        }
      >
        {syncing ? "Syncing..." : articleId ? "Sync" : "Sync GSC"}
      </button>
      {error && <p className="max-w-64 text-xs text-red-700">{error}</p>}
    </div>
  );
}
