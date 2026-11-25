import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const templateType = req.nextUrl.searchParams.get("template_type");
  const clientWhere = await selectedClientWhere();

  const articles = await prisma.article.findMany({
    where: { ...clientWhere, ...(status ? { status } : {}), ...(templateType ? { templateType } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ articles });
}
