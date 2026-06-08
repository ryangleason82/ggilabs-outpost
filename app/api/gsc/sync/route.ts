import { NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { syncArticleGsc } from "@/lib/gsc";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const clientId = await getSelectedClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Select a client before syncing GSC data." },
      { status: 400 },
    );
  }

  const articles = await prisma.article.findMany({
    where: {
      clientId,
      status: "published",
      publishedUrl: { not: null },
    },
    include: { client: true },
    orderBy: { publishedAt: "desc" },
  });

  const results = [];

  for (const article of articles) {
    if (!article.client) continue;

    try {
      const gscData = await syncArticleGsc(article, article.client);
      await prisma.article.update({
        where: { id: article.id },
        data: gscData,
      });
      results.push({ id: article.id, ok: true });
    } catch (error) {
      results.push({ id: article.id, ok: false, error: String(error) });
    }
  }

  return NextResponse.json({
    synced: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
}
