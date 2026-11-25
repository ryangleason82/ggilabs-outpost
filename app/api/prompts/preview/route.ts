import { NextRequest, NextResponse } from "next/server";
import { renderPromptMarkdown } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const body = await req.json() as { markdown?: string };
  return NextResponse.json({ html: renderPromptMarkdown(String(body.markdown ?? "")) });
}
