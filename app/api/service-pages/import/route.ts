import { NextResponse } from "next/server";
import { getSelectedClient } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { parseServicePageCsv, type ServicePageCsvIssue } from "@/lib/service-page-csv";

export async function POST(request: Request) {
  const selectedClient = await getSelectedClient(); if (!selectedClient) return NextResponse.json({ error: "Select a client before importing." }, { status: 400 });
  const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "Choose a service-page CSV file." }, { status: 400 });
  if (!/\.csv$/i.test(file.name)) return NextResponse.json({ error: "Service-page imports must be CSV files." }, { status: 400 });
  const { rows, issues } = parseServicePageCsv(await file.text()); const errors: ServicePageCsvIssue[] = issues.filter((issue) => issue.severity === "error");
  if (!rows.length || errors.length) return NextResponse.json({ error: "CSV validation failed. No pages were imported.", issues }, { status: 422 });
  const clientNames = [...new Set(rows.map((row) => row.data.client.toLowerCase()))];
  if (clientNames.length !== 1) return NextResponse.json({ error: "Mixed-client CSV files are not supported. Import one client per file.", issues: clientNames.map((name) => ({ row: 0, field: "client", severity: "error", message: name })) }, { status: 422 });
  if (clientNames[0] !== selectedClient.name.toLowerCase()) {
    const matched = await prisma.client.findFirst({ where: { name: { equals: rows[0].data.client } }, select: { name: true } });
    return NextResponse.json({ error: matched ? `This CSV belongs to ${matched.name}. Select that client in the sidebar and import again.` : `No Outpost client matches “${rows[0].data.client}”. Select or create the correct client before importing.` }, { status: 409 });
  }
  const existing = await prisma.servicePage.findMany({ where: { clientId: selectedClient.id, slug: { in: rows.map((row) => row.data.slug) } }, select: { slug: true } });
  if (existing.length) return NextResponse.json({ error: "Duplicate slugs already exist in Outpost. No pages were imported.", issues: existing.map((page) => ({ row: rows.find((row) => row.data.slug === page.slug)?.rowNumber ?? 0, field: "slug", severity: "error", message: `Slug already exists: ${page.slug}` })) }, { status: 409 });
  const pages = await prisma.$transaction(async (tx) => Promise.all(rows.map(async (row) => {
    const status = row.validation.status === "fail" ? "validation_failed" : row.validation.status === "warning" ? "validation_warning" : "ready_for_review";
    const inputs = { client: row.data.client, pageType: row.data.page_type, pageTitle: row.data.page_title, parent: row.data.parent_slug, serviceName: row.data.service_name, targetLocation: row.data.target_location, primaryKeyword: row.data.primary_keyword, secondaryKeywords: row.secondaryKeywords, featuredImage: row.data.featured_image_url, featuredImageAlt: row.data.featured_image_alt, ctaUrl: row.data.cta_url, importFilename: file.name, detectedInternalLinks: row.internalLinks, detectedImages: row.images };
    const page = await tx.servicePage.create({ data: { clientId: selectedClient.id, pageType: row.data.page_type, title: row.data.page_title, slug: row.data.slug, primaryKeyword: row.data.primary_keyword, status } });
    const revision = await tx.servicePageRevision.create({ data: { servicePageId: page.id, revisionNumber: 1, inputsJson: JSON.stringify(inputs), html: row.data.html_content, seoJson: JSON.stringify(row.seo), validationJson: JSON.stringify(row.validation), sectionsJson: JSON.stringify(row.sections), source: "csv_import" } });
    return tx.servicePage.update({ where: { id: page.id }, data: { currentRevisionId: revision.id } });
  })));
  const counts = { imported: pages.length, ready: pages.filter((page) => page.status === "ready_for_review").length, warnings: pages.filter((page) => page.status === "validation_warning").length, failed: pages.filter((page) => page.status === "validation_failed").length };
  return NextResponse.json({ pages, counts, issues: issues.filter((issue) => issue.severity === "warning") }, { status: 201 });
}
