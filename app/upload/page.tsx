"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  count: number;
  articles: { id: string; postTitle: string }[];
  invalidCount: number;
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
  skipped: { row: number; postName: string; reason: string }[];
  preview: boolean;
  overwrittenCount: number;
};

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const [templateType, setTemplateType] = useState("auto");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [prompts, setPrompts] = useState<{ id: string; name: string; currentApprovedVersionId: string | null; templateType: string; scope: string }[]>([]);
  const [compositions, setCompositions] = useState<{ id: string; name: string; templateType: string }[]>([]);
  const [promptVersionId, setPromptVersionId] = useState("");
  const [compositionId, setCompositionId] = useState("");
  const [generationProvider, setGenerationProvider] = useState("external");
  const [generationModel, setGenerationModel] = useState("unknown");

  useEffect(() => {
    Promise.all([fetch("/api/prompts?status=approved").then((res) => res.json()), fetch("/api/prompt-compositions").then((res) => res.json())])
      .then(([promptData, compositionData]) => { setPrompts(promptData.templates ?? []); setCompositions(compositionData.compositions ?? []); });
  }, []);

  async function uploadFile(file: File, mode: "preview" | "import" = "preview", duplicateAction: "skip" | "overwrite" = "skip") {
    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("templateType", templateType);
    formData.append("mode", mode);
    formData.append("duplicateAction", duplicateAction);
    formData.append("promptVersionId", promptVersionId);
    formData.append("compositionId", compositionId);
    formData.append("generationProvider", generationProvider);
    formData.append("generationModel", generationModel);

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
    setPendingFile(mode === "preview" ? file : null);
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Upload Articles CSV</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Add a single-article or multi-article CSV exported from the canonical prompt.
      </p>
      <label className="mb-4 block max-w-xs text-sm">
        <span className="mb-1 block font-medium text-zinc-700">Content template</span>
        <select value={templateType} onChange={(event) => setTemplateType(event.target.value)} className="w-full rounded border border-zinc-300 bg-white px-3 py-2">
          <option value="auto">Auto-detect from CSV</option>
          <option value="spoke">Spoke</option>
          <option value="service_detail">Service Detail</option>
        </select>
      </label>
      <div className="mb-6 grid gap-4 rounded border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-medium">Approved source prompt</span><select value={promptVersionId} onChange={(event) => { setPromptVersionId(event.target.value); setCompositionId(""); }} className="w-full rounded border border-zinc-300 px-3 py-2"><option value="">None / unknown</option>{prompts.filter((prompt) => prompt.currentApprovedVersionId).map((prompt) => <option key={prompt.id} value={prompt.currentApprovedVersionId!}>{prompt.name} ({prompt.scope}, {prompt.templateType})</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Prompt composition</span><select value={compositionId} onChange={(event) => { setCompositionId(event.target.value); setPromptVersionId(""); }} className="w-full rounded border border-zinc-300 px-3 py-2"><option value="">None</option>{compositions.map((composition) => <option key={composition.id} value={composition.id}>{composition.name}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Generation provider</span><input value={generationProvider} onChange={(event) => setGenerationProvider(event.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2" /></label>
        <label className="text-sm"><span className="mb-1 block font-medium">Generation model</span><input value={generationModel} onChange={(event) => setGenerationModel(event.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2" /></label>
      </div>

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
            {result.preview ? `${result.count} new record${result.count === 1 ? "" : "s"} ready to import.` : `${result.count} record${result.count === 1 ? "" : "s"} imported successfully${result.overwrittenCount ? `; ${result.overwrittenCount} existing record${result.overwrittenCount === 1 ? "" : "s"} overwritten` : ""}.`}
          </div>
          {result.errors.length > 0 && <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="mb-2 font-semibold">{result.invalidCount} invalid row{result.invalidCount === 1 ? "" : "s"}</p>
            <ul className="space-y-1">{result.errors.map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>Row {issue.row}, {issue.field}: {issue.message}</li>)}</ul>
          </div>}
          {result.warnings.length > 0 && <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="mb-2 font-semibold">Warnings</p>
            <ul className="space-y-1">{result.warnings.map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>Row {issue.row}, {issue.field}: {issue.message}</li>)}</ul>
          </div>}
          {result.skipped.length > 0 && <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="mb-2 font-semibold">Existing articles with matching slugs</p>
            <ul className="space-y-1">{result.skipped.map((item) => <li key={`${item.row}-${item.postName}`}>Row {item.row}, {item.postName}: {item.reason}</li>)}</ul>
          </div>}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {result.articles.map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0"
              >
                <p className="min-w-0 truncate text-sm font-medium">
                  {article.postTitle}
                </p>
                {!result.preview && <button
                  type="button"
                  onClick={() => router.push(`/articles/${article.id}`)}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  Review
                </button>}
              </div>
            ))}
          </div>
          {result.preview && pendingFile && <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={uploading || result.count === 0} onClick={() => void uploadFile(pendingFile, "import", "skip")} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{uploading ? "Importing..." : `Skip existing and import ${result.count} new`}</button>
            {result.skipped.length > 0 && <button type="button" disabled={uploading || result.count + result.skipped.length === 0} onClick={() => void uploadFile(pendingFile, "import", "overwrite")} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">{uploading ? "Importing..." : `Overwrite ${result.skipped.length} existing${result.count ? ` and import ${result.count} new` : ""}`}</button>}
          </div>}
          <button
            type="button"
            onClick={() => { setResult(null); setPendingFile(null); }}
            className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
