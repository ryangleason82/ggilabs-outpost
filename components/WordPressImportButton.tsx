"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WordPressImportButton() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function importResources() {
    setImporting(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/wordpress/import", {
      method: "POST",
    });
    const json = await res.json();
    setImporting(false);

    if (!res.ok) {
      setError(json.detail ?? json.error ?? "WordPress import failed");
      return;
    }

    setMessage(`Imported ${json.imported} resources`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={importing}
        onClick={() => void importResources()}
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
      >
        {importing ? "Importing..." : "Import WordPress Resources"}
      </button>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="max-w-72 text-xs text-red-700">{error}</p>}
    </div>
  );
}
