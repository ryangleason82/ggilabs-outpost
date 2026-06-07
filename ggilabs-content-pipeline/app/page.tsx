import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";

const statuses = ["uploaded", "reviewed", "approved", "published", "flagged"];

type StatusCount = {
  status: string;
  _count: { status: number };
};

type RecentArticle = {
  id: string;
  postTitle: string;
  primaryKeyword: string;
  status: string;
};

export default async function DashboardPage() {
  const [counts, recent]: [StatusCount[], RecentArticle[]] = await Promise.all([
    prisma.article.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        postTitle: true,
        primaryKeyword: true,
        status: true,
      },
    }),
  ]);

  const countMap = Object.fromEntries(
    counts.map(({ status, _count }) => [status, _count.status]),
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Review uploaded CSV articles and move approved content toward publishing.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Upload CSV
        </Link>
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((status) => (
          <Link
            key={status}
            href={`/articles?status=${status}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300"
          >
            <p className="mb-3 text-3xl font-semibold">{countMap[status] ?? 0}</p>
            <StatusBadge status={status} />
          </Link>
        ))}
      </section>

      <section className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/articles"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          View All Articles
        </Link>
        <Link
          href="/queue"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Publishing Queue ({countMap.approved ?? 0})
        </Link>
        <Link
          href="/library"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Published Library
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Articles</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-zinc-600">No articles uploaded yet.</p>
          ) : (
            recent.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0 hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{article.postTitle}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {article.primaryKeyword}
                  </p>
                </div>
                <StatusBadge status={article.status} />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
