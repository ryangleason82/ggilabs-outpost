import Link from "next/link";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ArticleRow = {
  id: string;
  postTitle: string;
  primaryKeyword: string;
  status: string;
  updatedAt: Date;
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const articles: ArticleRow[] = await prisma.article.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postTitle: true,
      primaryKeyword: true,
      status: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">All Articles</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {status ? `Filtered to ${status} articles.` : "All uploaded content."}
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Upload CSV
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-[1fr_160px_120px_120px_80px] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
          <span>Title</span>
          <span>Keyword</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>
        {articles.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">No articles found.</p>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className="grid grid-cols-[1fr_160px_120px_120px_80px] gap-4 border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0 hover:bg-zinc-50"
            >
              <Link
                href={`/articles/${article.id}`}
                className="min-w-0 truncate font-medium hover:underline"
              >
                {article.postTitle}
              </Link>
              <span className="min-w-0 truncate text-zinc-600">
                {article.primaryKeyword}
              </span>
              <StatusBadge status={article.status} />
              <span className="text-zinc-500">
                {formatDate(article.updatedAt)}
              </span>
              <DeleteArticleButton articleId={article.id} compact />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
