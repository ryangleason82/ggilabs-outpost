import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const clientWhere = await selectedClientWhere();

  const articles = await prisma.article.findMany({
    where: { ...clientWhere, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ articles });
}
