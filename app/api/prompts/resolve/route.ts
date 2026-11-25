import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { resolvePromptForGeneration } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId(); const body = await req.json() as Record<string, unknown>;
  try {
    const version = await resolvePromptForGeneration({ templateType: String(body.templateType ?? "spoke"), clientId, industry: String(body.industry ?? "") || null, promptTemplateId: String(body.promptTemplateId ?? "") || null, promptVersionId: String(body.promptVersionId ?? "") || null });
    return NextResponse.json({ version });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 422 }); }
}
