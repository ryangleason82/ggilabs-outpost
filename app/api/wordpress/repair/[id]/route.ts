import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { repairResourceMetadataInWordPress } from "@/lib/wordpress";

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

  if (!article || !article.client) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  const postId = Number(article.wpPostId);
  if (!Number.isFinite(postId)) {
    return NextResponse.json(
      { error: "Article has no valid WordPress post ID." },
      { status: 400 },
    );
  }

  try {
    await repairResourceMetadataInWordPress(article, article.client, postId);
    await prisma.article.update({
      where: { id },
      data: {
        reviewNotes: `WordPress Resource metadata repaired and verified for post ${postId}.`,
      },
    });
    return NextResponse.json({ repaired: true, postId });
  } catch (error) {
    return NextResponse.json(
      { error: "WordPress metadata repair failed", detail: String(error) },
      { status: 500 },
    );
  }
}
