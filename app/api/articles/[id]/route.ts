import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { runAutoChecks } from "@/lib/checker";
import { CSV_HEADERS } from "@/lib/parser";
import { SERVICE_DETAIL_FIELDS, type ServiceDetailPayload } from "@/lib/templates";
import { articleForApi, serviceDetailCompatibility, serviceDetailFromArticle } from "@/lib/content";
import { validateServiceDetail } from "@/lib/validation";
import { renderServiceDetail, serviceDetailConfigFromProfile } from "@/lib/service-detail-render";
import { validateServiceDetailForPublish } from "@/lib/service-detail-technical-seo";

async function articleResponse(article: Parameters<typeof articleForApi>[0]) {
  const profile = article.clientId ? await prisma.siteProfile.findUnique({ where: { clientId: article.clientId } }) : null;
  const config = serviceDetailConfigFromProfile(profile);
  const api = articleForApi(article);
  const record = article.templateType === "service_detail" ? serviceDetailFromArticle(article) : null;
  const technicalSeo = record?.content_format === "html" ? validateServiceDetailForPublish(record, renderServiceDetail(record, config), config) : undefined;
  return { ...api, serviceDetailSeoConfig: config, technicalSeo };
}

const editableFields = new Set([
  "status",
  ...CSV_HEADERS,
  ...SERVICE_DETAIL_FIELDS,
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
  const clientWhere = await selectedClientWhere();
  const article = await prisma.article.findFirst({ where: { id, ...clientWhere } });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ article: await articleResponse(article) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rawUpdates = (await req.json()) as Record<string, unknown>;
  const clientWhere = await selectedClientWhere();
  const updates = Object.fromEntries(
    Object.entries(rawUpdates).filter(([key]) => editableFields.has(key)),
  );

  const existing = await prisma.article.findFirst({ where: { id, ...clientWhere } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isServiceDetail = existing.templateType === "service_detail";
  const isContentUpdate = [...CSV_HEADERS, ...SERVICE_DETAIL_FIELDS].some((field) => field in updates);

  if (isContentUpdate) {
    if (isServiceDetail) {
      const mergedPayload = {
        ...serviceDetailFromArticle(existing),
        ...Object.fromEntries(SERVICE_DETAIL_FIELDS.filter((field) => field in updates).map((field) => [field, String(updates[field] ?? "")])),
      } as ServiceDetailPayload;
      const validation = validateServiceDetail(mergedPayload);
      if (!validation.valid) {
        return NextResponse.json({ error: "Validation failed", errors: validation.errors, warnings: validation.warnings }, { status: 422 });
      }
      Object.assign(updates, serviceDetailCompatibility(validation.data));
      for (const field of SERVICE_DETAIL_FIELDS) delete updates[field];
    }
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

  return NextResponse.json({ article: await articleResponse(article) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientWhere = await selectedClientWhere();
  const existing = await prisma.article.findFirst({ where: { id, ...clientWhere } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.article.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
