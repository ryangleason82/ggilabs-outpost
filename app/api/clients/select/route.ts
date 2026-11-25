import { NextRequest, NextResponse } from "next/server";
import { SELECTED_CLIENT_COOKIE } from "@/lib/clients";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { clientId } = (await req.json()) as { clientId?: string };

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required." }, { status: 422 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, clientId });
  res.cookies.set(SELECTED_CLIENT_COOKIE, clientId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
