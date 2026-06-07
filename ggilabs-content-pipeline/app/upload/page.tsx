"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  count: number;
  articles: { id: string; postTitle: string }[];
};

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(json.error ?? "Upload failed");
      return;
    }

    setResult(json);
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Upload Articles CSV</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Add a single-article or multi-article CSV exported from the canonical prompt.
      </p>

      {!result && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void uploadFile(file);
          }}
          className={`rounded-lg border-2 border-dashed bg-white p-12 text-center ${
            dragging ? "border-zinc-900" : "border-zinc-300"
          }`}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
            }}
            className="hidden"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <span className="block text-lg font-medium text-zinc-800">
              {uploading ? "Processing..." : "Drop CSV here or click to upload"}
            </span>
            <span className="mt-2 block text-sm text-zinc-500">
              The file will be parsed, checked, and saved to the local database.
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {result.count} article{result.count === 1 ? "" : "s"} uploaded successfully.
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {result.articles.map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0"
              >
                <p className="min-w-0 truncate text-sm font-medium">
                  {article.postTitle}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/articles/${article.id}`)}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
