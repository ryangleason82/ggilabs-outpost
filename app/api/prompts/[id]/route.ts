import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt, safePromptSlug } from "@/lib/prompts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const template = await prisma.promptTemplate.findUnique({ where: { id }, include: { client: { select: { name: true } }, versions: { orderBy: { versionNumber: "desc" } } } });
  if (!template || !canAccessPrompt(template, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing || !canAccessPrompt(existing, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as Record<string, unknown>;
  const allowed = ["name", "description", "templateType", "industry", "scope"];
  const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)).map(([key, value]) => [key, String(value ?? "").trim() || null]));
  if (body.slug !== undefined) data.slug = safePromptSlug(String(body.slug));
  if (data.scope === "client") data.clientId = clientId;
  else if (data.scope) data.clientId = null;
  const targetSlug = String(data.slug ?? existing.slug); const targetScope = String(data.scope ?? existing.scope);
  const targetClientId = targetScope === "client" ? (clientId ?? existing.clientId) : null;
  const duplicate = await prisma.promptTemplate.findFirst({ where: { id: { not: id }, slug: targetSlug, scope: targetScope, clientId: targetClientId } });
  if (duplicate) return NextResponse.json({ error: "A prompt with this slug already exists in the selected scope." }, { status: 409 });
  const template = await prisma.promptTemplate.update({ where: { id }, data });
  return NextResponse.json({ template });
}
