import { env } from "cloudflare:workers";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { articleForApi } from "@/lib/content";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Featured image must be JPG, PNG, or WebP." },
      { status: 422 },
    );
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Featured image must be 8MB or smaller." },
      { status: 422 },
    );
  }

  const clientWhere = await selectedClientWhere();
  const article = await prisma.article.findFirst({ where: { id, ...clientWhere } });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = `${randomUUID()}.${extension}`;
  const imagePath = `/uploads/${filename}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await (env as unknown as {BUCKET:R2Bucket}).BUCKET.put(`uploads/${filename}`, bytes, {httpMetadata:{contentType:file.type}});

  const updated = await prisma.article.update({
    where: { id },
    data: {
      featuredImagePath: imagePath,
      featuredImageFilename: `${article.postName}.${extension}`,
      wpFeaturedMediaId: null,
    },
  });

  return NextResponse.json({ article: articleForApi(updated) });
}
