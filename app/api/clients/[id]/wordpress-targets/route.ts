import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWordPressPublishingTargets } from "@/lib/wordpress";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  try { return NextResponse.json({ valid: true, targets: await validateWordPressPublishingTargets(client) }); }
  catch (error) { return NextResponse.json({ valid: false, error: String(error) }, { status: 422 }); }
}
