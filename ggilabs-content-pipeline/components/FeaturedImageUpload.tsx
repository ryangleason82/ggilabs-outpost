"use client";

import Image from "next/image";
import { useState } from "react";

export function FeaturedImageUpload({
  articleId,
  imagePath,
  imageFilename,
  onUploaded,
}: {
  articleId: string;
  imagePath?: string | null;
  imageFilename?: string | null;
  onUploaded: (article: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/articles/${articleId}/featured-image`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();

    setUploading(false);

    if (!res.ok) {
      setError(json.error ?? "Image upload failed");
      return;
    }

    onUploaded(json.article);
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase text-zinc-500">
        Featured Image
      </h2>

      {imagePath ? (
        <div className="mb-3 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
          <Image
            src={imagePath}
            alt={imageFilename ?? "Featured image"}
            width={640}
            height={360}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : (
        <div className="mb-3 rounded border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          No featured image selected.
        </div>
      )}

      <label className="block cursor-pointer rounded border border-zinc-300 bg-white px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50">
        {uploading ? "Uploading..." : imagePath ? "Replace Image" : "Upload Image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="hidden"
        />
      </label>

      {imageFilename && (
        <p className="mt-2 truncate text-xs text-zinc-500">{imageFilename}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
