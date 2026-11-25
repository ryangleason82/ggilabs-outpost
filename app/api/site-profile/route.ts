import { NextResponse } from "next/server";
import { getSelectedClient } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { defaultSiteProfile, parseJson } from "@/lib/service-pages";

export async function GET() {
  const client = await getSelectedClient(); if (!client) return NextResponse.json({ error: "Select a client first." }, { status: 400 });
  const stored = await prisma.siteProfile.findUnique({ where: { clientId: client.id } });
  const defaults = defaultSiteProfile(client.name, client.wpUrl);
  return NextResponse.json({ profile: stored ? { ...stored, brand: parseJson(stored.brandJson, defaults.brand), template: parseJson(stored.templateJson, defaults.template), internalLinks: parseJson(stored.internalLinksJson, []) } : defaults });
}

export async function PATCH(request: Request) {
  const client = await getSelectedClient(); if (!client) return NextResponse.json({ error: "Select a client first." }, { status: 400 });
  const body = await request.json(); const defaults = defaultSiteProfile(client.name, client.wpUrl);
  const profile = await prisma.siteProfile.upsert({ where: { clientId: client.id }, create: { clientId: client.id, businessName: String(body.businessName || client.name), domain: String(body.domain || client.wpUrl), brandJson: JSON.stringify(body.brand ?? defaults.brand), templateJson: JSON.stringify(body.template ?? defaults.template), internalLinksJson: JSON.stringify(body.internalLinks ?? []), seoPlugin: String(body.seoPlugin || "rank_math"), wordpressRestBase: String(body.wordpressRestBase || "pages") }, update: { businessName: String(body.businessName || client.name), domain: String(body.domain || client.wpUrl), brandJson: JSON.stringify(body.brand ?? defaults.brand), templateJson: JSON.stringify(body.template ?? defaults.template), internalLinksJson: JSON.stringify(body.internalLinks ?? []), seoPlugin: String(body.seoPlugin || "rank_math"), wordpressRestBase: String(body.wordpressRestBase || "pages") } });
  return NextResponse.json({ profile });
}
