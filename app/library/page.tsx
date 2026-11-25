import Link from "next/link";
import { GscSyncButton } from "@/components/GscSyncButton";
import { StatusBadge } from "@/components/StatusBadge";
import { WordPressImportButton } from "@/components/WordPressImportButton";
import { getSelectedClient, selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";

function indexLabel(verdict: string | null, coverageState: string | null) {
  if (!verdict && !coverageState) return "No GSC data";
  if (coverageState) return coverageState;
  if (verdict === "PASS") return "Indexed";
  if (verdict === "FAIL") return "Not indexed";
  return verdict ?? "Unknown";
}

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function LibraryPage() {
  const [selectedClient, clientWhere] = await Promise.all([
    getSelectedClient(),
    selectedClientWhere(),
  ]);
  const articles = await prisma.article.findMany({
    where: { ...clientWhere, status: "published" },
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
      gscIndexedStatus: true,
      gscCoverageState: true,
      gscLastCrawlTime: true,
      gscInspectionUpdatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Published Library</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {selectedClient
              ? `Published ${selectedClient.name} articles, index status, and Search Console metrics.`
            : "Add a client before publishing articles."}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-3">
          <WordPressImportButton />
          <GscSyncButton />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_180px_80px_100px_90px_110px_80px] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
          <span>Title</span>
          <span>Index status</span>
          <span>Clicks</span>
          <span>Impressions</span>
          <span>Position</span>
          <span>Last crawl</span>
          <span>Actions</span>
        </div>
        {articles.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">No published articles yet.</p>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className="grid grid-cols-[minmax(0,1fr)_180px_80px_100px_90px_110px_80px] gap-4 border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0 hover:bg-zinc-50"
            >
              <span className="min-w-0">
                <Link
                  href={article.publishedUrl ?? `/articles/${article.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {article.postTitle}
                </Link>
                <span className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  {article.primaryKeyword}
                  <StatusBadge status={article.status} />
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate">
                  {indexLabel(article.gscIndexedStatus, article.gscCoverageState)}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Synced {formatDate(article.gscInspectionUpdatedAt)}
                </span>
              </span>
              <span>{article.gscClicks30d ?? 0}</span>
              <span>{article.gscImpressions30d ?? 0}</span>
              <span>
                {article.rankingPosition ? article.rankingPosition.toFixed(1) : "-"}
              </span>
              <span>{formatDate(article.gscLastCrawlTime)}</span>
              <GscSyncButton articleId={article.id} compact />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
