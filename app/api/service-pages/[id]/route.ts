import { NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { servicePageForClient, serializeServicePage } from "@/lib/service-page-data";
export async function GET(_request: Request, context: RouteContext<"/api/service-pages/[id]">) { const { id } = await context.params; const page = await servicePageForClient(id, await getSelectedClientId()); return page ? NextResponse.json({ page: serializeServicePage(page) }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
