import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { syncArticleGsc } from "@/lib/gsc";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientWhere = await selectedClientWhere();
  const article = await prisma.article.findFirst({
    where: { id, ...clientWhere },
    include: { client: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!article.client) {
    return NextResponse.json(
      { error: "Article is not assigned to a client." },
      { status: 400 },
    );
  }

  if (article.status !== "published" || !article.publishedUrl) {
    return NextResponse.json(
      { error: "Article must be published and have a published URL before GSC sync." },
      { status: 400 },
    );
  }

  try {
    const gscData = await syncArticleGsc(article, article.client);
    const updated = await prisma.article.update({
      where: { id },
      data: gscData,
    });

    return NextResponse.json({ article: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "GSC sync failed", detail: String(error) },
      { status: 500 },
    );
  }
}
