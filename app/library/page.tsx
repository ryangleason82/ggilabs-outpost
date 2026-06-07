import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";

export default async function LibraryPage() {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      postTitle: true,
      primaryKeyword: true,
      status: true,
      publishedUrl: true,
      gscClicks30d: true,
      gscImpressions30d: true,
      rankingPosition: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Published Library</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Published articles and their latest Search Console metrics.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-[1fr_110px_130px_110px] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
          <span>Title</span>
          <span>Clicks</span>
          <span>Impressions</span>
          <span>Position</span>
        </div>
        {articles.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">No published articles yet.</p>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id}
              href={article.publishedUrl ?? `/articles/${article.id}`}
              className="grid grid-cols-[1fr_110px_130px_110px] gap-4 border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0 hover:bg-zinc-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{article.postTitle}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  {article.primaryKeyword}
                  <StatusBadge status={article.status} />
                </span>
              </span>
              <span>{article.gscClicks30d ?? 0}</span>
              <span>{article.gscImpressions30d ?? 0}</span>
              <span>
                {article.rankingPosition ? article.rankingPosition.toFixed(1) : "-"}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
