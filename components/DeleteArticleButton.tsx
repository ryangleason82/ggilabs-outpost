"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteArticleButton({
  articleId,
  redirectTo = "/articles",
  compact = false,
}: {
  articleId: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteArticle() {
    if (!window.confirm("Delete this article? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    const res = await fetch(`/api/articles/${articleId}`, {
      method: "DELETE",
    });
    setDeleting(false);

    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={() => void deleteArticle()}
      className={
        compact
          ? "rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          : "rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      }
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
