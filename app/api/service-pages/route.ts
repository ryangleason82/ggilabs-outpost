import { NextResponse } from "next/server";
import { getSelectedClient } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { serializeServicePage } from "@/lib/service-page-data";

export async function GET() { const client = await getSelectedClient(); if (!client) return NextResponse.json({ pages: [] }); const pages = await prisma.servicePage.findMany({ where: { clientId: client.id }, include: { revisions: { orderBy: { revisionNumber: "desc" } } }, orderBy: { updatedAt: "desc" } }); return NextResponse.json({ pages: pages.map(serializeServicePage) }); }
