import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutoChecks } from "@/lib/checker";
import { CSV_HEADERS } from "@/lib/parser";

const editableFields = new Set([
  "status",
  ...CSV_HEADERS,
  "checkOpinionInS1",
  "checkRealExampleSpecific",
  "checkAllStatsLinked",
  "checkExternalLinksCorrect",
  "checkMetaCapsCorrect",
  "checkCtaSpecific",
  "checkParagraphLength",
  "checkTableRendersCorrect",
  "checkNoForcedHumor",
  "checkVoiceContractorAware",
  "overallScore",
  "reviewNotes",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ article });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rawUpdates = (await req.json()) as Record<string, unknown>;
  const updates = Object.fromEntries(
    Object.entries(rawUpdates).filter(([key]) => editableFields.has(key)),
  );

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isContentUpdate = CSV_HEADERS.some((field) => field in updates);

  if (isContentUpdate) {
    const merged = Object.fromEntries(
      Object.entries({ ...existing, ...updates }).map(([key, value]) => [
        key,
        String(value ?? ""),
      ]),
    );
    Object.assign(updates, runAutoChecks(merged), {
      version: existing.version + 1,
    });
  }

  const article = await prisma.article.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ article });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await prisma.article.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
