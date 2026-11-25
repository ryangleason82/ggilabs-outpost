import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { assemblePromptVersions } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId(); const body = await req.json() as { versionIds?: string[]; generationInputs?: string };
  try { return NextResponse.json(await assemblePromptVersions(body.versionIds ?? [], clientId, String(body.generationInputs ?? ""))); }
  catch (error) { return NextResponse.json({ error: String(error) }, { status: 422 }); }
}
