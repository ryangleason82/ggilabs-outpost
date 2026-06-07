"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishArticleButton({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    setPublishing(true);
    setError("");

    const res = await fetch(`/api/publish/${articleId}`, {
      method: "POST",
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={publishing}
        onClick={() => void publish()}
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {publishing ? "Sending..." : "Send to WordPress"}
      </button>
      {error && <p className="max-w-64 text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
