import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushResourceDraftToWordPress } from "@/lib/wordpress";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (article.status !== "approved") {
    return NextResponse.json(
      { error: "Article must be approved before publishing to WordPress." },
      { status: 400 },
    );
  }

  try {
    const { postId, previewUrl, publishedUrl, featuredMediaId } =
      await pushResourceDraftToWordPress(article);

    const updated = await prisma.article.update({
      where: { id },
      data: {
        status: "published",
        wpPostId: String(postId),
        wpFeaturedMediaId: featuredMediaId ? String(featuredMediaId) : null,
        publishedUrl: publishedUrl ?? previewUrl,
        publishedAt: new Date(),
        reviewNotes: `WordPress Resources draft created: ${previewUrl}`,
      },
    });

    return NextResponse.json({ article: updated, postId, previewUrl });
  } catch (error) {
    await prisma.article.update({
      where: { id },
      data: { reviewNotes: `WordPress publish failed: ${String(error)}` },
    });

    return NextResponse.json(
      { error: "WordPress publish failed", detail: String(error) },
      { status: 500 },
    );
  }
}
