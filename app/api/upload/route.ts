import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/parser";
import { runAutoChecks } from "@/lib/checker";

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Create or select a client before uploading articles." },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseCSV(await file.text());
  } catch (error) {
    return NextResponse.json(
      { error: "CSV parse failed", detail: String(error) },
      { status: 422 },
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No articles found in CSV" }, { status: 422 });
  }

  const batch = await prisma.batch.create({
    data: {
      filename: file.name,
      articleCount: parsed.length,
      clientId,
    },
  });

  const articles = await Promise.all(
    parsed.map((article) => {
      const autoChecks = runAutoChecks(article);

      return prisma.article.create({
        data: {
          clientId,
          batchName: file.name,
          postTitle: article.postTitle,
          postName: article.postName,
          postStatus: article.postStatus || "draft",
          postType: article.postType || "education",
          templateType: article.templateType || "spoke",
          primaryKeyword: article.primaryKeyword,
          serviceName: article.serviceName || null,
          locationName: article.locationName || null,
          heroEyebrow: article.heroEyebrow || null,
          heroHeading: article.heroHeading,
          heroSubheading: article.heroSubheading,
          introSummary: article.introSummary,
          section1Heading: article.section1Heading,
          section1Body: article.section1Body,
          section2Heading: article.section2Heading,
          section2Body: article.section2Body,
          section3Heading: article.section3Heading,
          section3Body: article.section3Body,
          faq1Question: article.faq1Question,
          faq1Answer: article.faq1Answer,
          faq2Question: article.faq2Question,
          faq2Answer: article.faq2Answer,
          faq3Question: article.faq3Question,
          faq3Answer: article.faq3Answer,
          ctaHeading: article.ctaHeading,
          ctaBody: article.ctaBody,
          ctaButtonText: article.ctaButtonText,
          ctaButtonUrl: article.ctaButtonUrl,
          relatedHubUrl: article.relatedHubUrl,
          relatedHubAnchor: article.relatedHubAnchor,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          ...autoChecks,
        },
      });
    }),
  );

  return NextResponse.json({ batch, articles, count: articles.length });
}
