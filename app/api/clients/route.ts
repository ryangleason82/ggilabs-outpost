import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const [clients, selectedClientId] = await Promise.all([
    prisma.client.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        wpUrl: true,
        wpUsername: true,
        wpResourceRestBase: true,
        gscPropertyUrl: true,
        gscClientId: true,
        gscClientSecret: true,
        gscRefreshToken: true,
        isDefault: true,
        wpAppPassword: true,
      },
    }),
    getSelectedClientId(),
  ]);

  return NextResponse.json({
    clients: clients.map(
      ({ wpAppPassword, gscClientSecret, gscRefreshToken, ...client }) => ({
      ...client,
      hasWpAppPassword: wpAppPassword.length > 0,
      hasGscClientSecret: Boolean(gscClientSecret),
      hasGscRefreshToken: Boolean(gscRefreshToken),
    })),
    selectedClientId,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const name = cleanText(body.name);
  const wpUrl = cleanText(body.wpUrl).replace(/\/$/, "");
  const wpUsername = cleanText(body.wpUsername);
  const wpAppPassword = cleanText(body.wpAppPassword);
  const wpResourceRestBase = cleanText(body.wpResourceRestBase) || "resources";
  const gscPropertyUrl = cleanText(body.gscPropertyUrl) || null;
  const gscClientId = cleanText(body.gscClientId) || null;
  const gscClientSecret = cleanText(body.gscClientSecret) || null;
  const gscRefreshToken = cleanText(body.gscRefreshToken) || null;
  const isDefault = Boolean(body.isDefault);

  if (!name || !wpUrl || !wpUsername || !wpAppPassword) {
    return NextResponse.json(
      { error: "Name, WordPress URL, username, and application password are required." },
      { status: 422 },
    );
  }

  if (isDefault) {
    await prisma.client.updateMany({ data: { isDefault: false } });
  }

  const client = await prisma.client.create({
    data: {
      name,
      wpUrl,
      wpUsername,
      wpAppPassword,
      wpResourceRestBase,
      gscPropertyUrl,
      gscClientId,
      gscClientSecret,
      gscRefreshToken,
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

  return NextResponse.json({ client }, { status: 201 });
}
