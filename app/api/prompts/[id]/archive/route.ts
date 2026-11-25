import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt } from "@/lib/prompts";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const template = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!template || !canAccessPrompt(template, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const archived = await prisma.promptTemplate.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } });
  return NextResponse.json({ template: archived });
}
