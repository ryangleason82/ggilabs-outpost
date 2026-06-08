import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const name = cleanText(body.name);
  const wpUrl = cleanText(body.wpUrl).replace(/\/$/, "");
  const wpUsername = cleanText(body.wpUsername);
  const wpAppPassword = cleanText(body.wpAppPassword);
  const wpResourceRestBase = cleanText(body.wpResourceRestBase) || "resources";
  const gscPropertyUrl = cleanText(body.gscPropertyUrl) || null;
  const gscClientId = cleanText(body.gscClientId) || null;
  const gscClientSecret = cleanText(body.gscClientSecret);
  const gscRefreshToken = cleanText(body.gscRefreshToken);
  const isDefault = Boolean(body.isDefault);

  if (!name || !wpUrl || !wpUsername) {
    return NextResponse.json(
      { error: "Name, WordPress URL, and username are required." },
      { status: 422 },
    );
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  if (isDefault) {
    await prisma.client.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      name,
      wpUrl,
      wpUsername,
      ...(wpAppPassword ? { wpAppPassword } : {}),
      wpResourceRestBase,
      gscPropertyUrl,
      gscClientId,
      ...(gscClientSecret ? { gscClientSecret } : {}),
      ...(gscRefreshToken ? { gscRefreshToken } : {}),
      isDefault,
    },
    select: {
      id: true,
      name: true,
      wpUrl: true,
      wpUsername: true,
      wpResourceRestBase: true,
      gscPropertyUrl: true,
      gscClientId: true,
      isDefault: true,
    },
  });

  return NextResponse.json({ client });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const articleCount = await prisma.article.count({ where: { clientId: id } });

  if (articleCount > 0) {
    return NextResponse.json(
      { error: "Move or delete this client's articles before deleting the client." },
      { status: 409 },
    );
  }

  const clientCount = await prisma.client.count();
  if (clientCount <= 1) {
    return NextResponse.json(
      { error: "At least one client is required." },
      { status: 409 },
    );
  }

  try {
    await prisma.client.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
