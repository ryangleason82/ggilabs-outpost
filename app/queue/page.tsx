import Link from "next/link";
import { PublishArticleButton } from "@/components/PublishArticleButton";
import { StatusBadge } from "@/components/StatusBadge";
import { getSelectedClient, selectedClientWhere } from "@/lib/clients";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function QueuePage() {
  const [selectedClient, clientWhere] = await Promise.all([
    getSelectedClient(),
    selectedClientWhere(),
  ]);
  const articles = await prisma.article.findMany({
    where: { ...clientWhere, status: "approved" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      postTitle: true,
      primaryKeyword: true,
      updatedAt: true,
      status: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Publishing Queue</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {selectedClient
            ? `Approved ${selectedClient.name} articles waiting for WordPress publishing.`
            : "Add a client before publishing articles."}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {articles.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">No approved articles yet.</p>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0 hover:bg-zinc-50"
            >
              <div className="min-w-0">
                <Link
                  href={`/articles/${article.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {article.postTitle}
                </Link>
                <p className="truncate text-xs text-zinc-500">
                  {article.primaryKeyword} - Approved {formatDate(article.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={article.status} />
                <PublishArticleButton articleId={article.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
