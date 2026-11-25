import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { parseCSVImport, type ParsedArticle } from "@/lib/parser";
import { runAutoChecks } from "@/lib/checker";
import { validateServiceDetail, type FieldIssue } from "@/lib/validation";
import type { ServiceDetailPayload } from "@/lib/templates";
import { serviceDetailCompatibility } from "@/lib/content";
import { assemblePromptVersions, canAccessPrompt, resolvePromptForGeneration } from "@/lib/prompts";

function spokeData(article: ParsedArticle, clientId: string, filename: string) {
  return {
    clientId, batchName: filename,
    postTitle: article.postTitle, postName: article.postName,
    postStatus: article.postStatus || "draft", postType: article.postType || "education",
    templateType: article.templateType || "spoke", primaryKeyword: article.primaryKeyword,
    serviceName: article.serviceName || null, locationName: article.locationName || null,
    heroEyebrow: article.heroEyebrow || null, heroHeading: article.heroHeading,
    heroSubheading: article.heroSubheading, introSummary: article.introSummary,
    section1Heading: article.section1Heading, section1Body: article.section1Body,
    section2Heading: article.section2Heading, section2Body: article.section2Body,
    section3Heading: article.section3Heading, section3Body: article.section3Body,
    faq1Question: article.faq1Question, faq1Answer: article.faq1Answer,
    faq2Question: article.faq2Question, faq2Answer: article.faq2Answer,
    faq3Question: article.faq3Question, faq3Answer: article.faq3Answer,
    ctaHeading: article.ctaHeading, ctaBody: article.ctaBody,
    ctaButtonText: article.ctaButtonText, ctaButtonUrl: article.ctaButtonUrl,
    relatedHubUrl: article.relatedHubUrl, relatedHubAnchor: article.relatedHubAnchor,
    metaTitle: article.metaTitle, metaDescription: article.metaDescription,
    ...runAutoChecks(article),
  };
}

const reviewReset = {
  checkOpinionInS1: null, checkRealExampleSpecific: null, checkAllStatsLinked: null,
  checkExternalLinksCorrect: null, checkMetaCapsCorrect: null, checkCtaSpecific: null,
  checkParagraphLength: null, checkTableRendersCorrect: null, checkNoForcedHumor: null,
  checkVoiceContractorAware: null, overallScore: null, reviewNotes: null,
};

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId();
  if (!clientId) return NextResponse.json({ error: "Create or select a client before uploading articles." }, { status: 400 });
  const formData = await req.formData();
  const file = formData.get("file");
  const selectedTemplate = formData.get("templateType");
  const previewOnly = formData.get("mode") === "preview";
  const overwriteDuplicates = formData.get("duplicateAction") === "overwrite";
  const forcedTemplate = selectedTemplate === "spoke" || selectedTemplate === "service_detail" ? selectedTemplate : undefined;
  const promptVersionId = String(formData.get("promptVersionId") ?? "");
  const compositionId = String(formData.get("compositionId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  let parsed;
  try {
    parsed = parseCSVImport(await file.text(), forcedTemplate);
  } catch (error) {
    return NextResponse.json({ error: "CSV parse failed", detail: String(error) }, { status: 422 });
  }
  if (!parsed.length) return NextResponse.json({ error: "No articles found in CSV" }, { status: 422 });

  let componentVersionIds: string[] = [];
  let promptTemplateId: string | null = null;
  let assembledPromptHash: string | null = null;
  if (compositionId) {
    const composition = await prisma.promptComposition.findFirst({ where: { id: compositionId, OR: [{ clientId }, { clientId: null }], status: "approved" }, include: { items: { orderBy: { position: "asc" }, include: { promptTemplate: true, promptVersion: true } } } });
    if (!composition || composition.items.some((item) => !canAccessPrompt(item.promptTemplate, clientId))) return NextResponse.json({ error: "Prompt composition is unavailable or unauthorized." }, { status: 422 });
    componentVersionIds = composition.items.map((item) => item.promptVersionId);
    const assembled = await assemblePromptVersions(componentVersionIds, clientId);
    assembledPromptHash = assembled.assembledPromptHash;
  } else if (promptVersionId) {
    const resolved = await resolvePromptForGeneration({ templateType: forcedTemplate ?? parsed[0].templateType, clientId, promptVersionId });
    if (!resolved) return NextResponse.json({ error: "Approved prompt version not found." }, { status: 422 });
    componentVersionIds = [resolved.id]; promptTemplateId = resolved.promptTemplateId;
    assembledPromptHash = (await assemblePromptVersions(componentVersionIds, clientId)).assembledPromptHash;
  }
  const provenance = componentVersionIds.length ? {
    promptTemplateId, promptVersionId: componentVersionIds.length === 1 ? componentVersionIds[0] : null,
    promptCompositionId: compositionId || null, promptComponentVersionIds: JSON.stringify(componentVersionIds),
    assembledPromptHash, generationProvider: String(formData.get("generationProvider") ?? "external") || "external",
    generationModel: String(formData.get("generationModel") ?? "unknown") || "unknown",
    generationTimestamp: new Date(), generatedBy: "local-operator",
    generationInputs: JSON.stringify({ source: file.name }),
  } : {};

  const articles = [];
  const errors: FieldIssue[] = [];
  const warnings: FieldIssue[] = [];
  const skipped: { row: number; postName: string; reason: string; existingId: string; existingStatus: string }[] = [];
  let overwrittenCount = 0;

  for (const row of parsed) {
    if (row.templateType === "service_detail") {
      const validation = validateServiceDetail(row.data as ServiceDetailPayload, row.rowNumber, row.headers);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      if (!validation.valid) continue;
      const duplicate = await prisma.article.findFirst({
        where: { clientId, postName: validation.data.post_name },
        select: { id: true, status: true },
      });
      if (duplicate) {
        if (previewOnly || !overwriteDuplicates) {
          skipped.push({ row: row.rowNumber, postName: validation.data.post_name, reason: `Duplicate slug (${duplicate.status}); existing content was not changed.`, existingId: duplicate.id, existingStatus: duplicate.status });
          continue;
        }
        const compatibility = serviceDetailCompatibility(validation.data);
        const updated = await prisma.article.update({
          where: { id: duplicate.id },
          data: {
            batchName: file.name,
            status: validation.data.content_format === "html" ? "reviewed" : "uploaded",
            ...compatibility,
            ...runAutoChecks(validation.data),
            ...reviewReset,
            ...provenance,
            version: { increment: 1 },
          },
        });
        articles.push(updated);
        overwrittenCount += 1;
        continue;
      }
      const compatibility = serviceDetailCompatibility(validation.data);
      articles.push(previewOnly
        ? { id: `preview-${row.rowNumber}`, postTitle: validation.data.post_title }
        : await prisma.article.create({ data: { clientId, batchName: file.name, status: validation.data.content_format === "html" ? "reviewed" : "uploaded", ...compatibility, ...runAutoChecks(validation.data), ...provenance } }));
    } else {
      const article = row.data as ParsedArticle;
      const duplicate = article.postName ? await prisma.article.findFirst({
        where: { clientId, postName: article.postName },
        select: { id: true, status: true },
      }) : null;
      if (duplicate) {
        if (previewOnly || !overwriteDuplicates) {
          skipped.push({ row: row.rowNumber, postName: article.postName, reason: `Duplicate slug (${duplicate.status}); existing content was not changed.`, existingId: duplicate.id, existingStatus: duplicate.status });
          continue;
        }
        const updated = await prisma.article.update({
          where: { id: duplicate.id },
          data: {
            ...spokeData(article, clientId, file.name),
            status: "uploaded",
            ...reviewReset,
            ...provenance,
            version: { increment: 1 },
          },
        });
        articles.push(updated);
        overwrittenCount += 1;
        continue;
      }
      articles.push(previewOnly
        ? { id: `preview-${row.rowNumber}`, postTitle: article.postTitle }
        : await prisma.article.create({ data: { ...spokeData(article, clientId, file.name), ...provenance } }));
    }
  }

  const batch = previewOnly ? null : await prisma.batch.create({ data: { filename: file.name, articleCount: articles.length, clientId } });
  if (!previewOnly && articles.length && componentVersionIds.length) {
    const templateIds = await prisma.promptVersion.findMany({ where: { id: { in: componentVersionIds } }, select: { promptTemplateId: true } });
    await prisma.promptTemplate.updateMany({ where: { id: { in: templateIds.map((item) => item.promptTemplateId) } }, data: { lastUsedAt: new Date(), usageCount: { increment: articles.length } } });
  }
  return NextResponse.json({
    batch, articles, count: articles.length, errors, warnings, skipped, preview: previewOnly, overwrittenCount,
    invalidCount: new Set(errors.map((issue) => issue.row)).size,
  });
}
