import { createHash } from "node:crypto";
import type { Prisma, PromptTemplate, PromptVersion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";

export const PROMPT_SCOPES = ["global", "workspace", "industry", "client"] as const;
export const PROMPT_STATUSES = ["draft", "approved", "archived"] as const;
export const PROMPT_ROLES = ["global_template", "industry_addendum", "client_context", "generation_inputs", "output_schema", "custom"] as const;
export type PromptScope = (typeof PROMPT_SCOPES)[number];

export function hashPrompt(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function safePromptSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parsePromptMarkdown(source: string) {
  const normalized = source.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) {
    return { metadata: {} as Record<string, string>, markdown: normalized.trim() };
  }
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, markdown: normalized.trim() };
  const metadata: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return { metadata, markdown: normalized.slice(match[0].length).trim() };
}

function yamlValue(value: unknown) {
  return JSON.stringify(value ?? "");
}

export function exportPromptMarkdown(template: PromptTemplate, version: PromptVersion, clientName = "") {
  const frontmatter = [
    ["name", template.name], ["slug", template.slug], ["description", template.description],
    ["template_type", template.templateType], ["scope", template.scope],
    ["industry", template.industry ?? ""], ["client", clientName],
    ["version", version.versionNumber], ["status", version.status],
    ["created_at", version.createdAt.toISOString()], ["approved_at", version.approvedAt?.toISOString() ?? ""],
  ].map(([key, value]) => `${key}: ${yamlValue(value)}`).join("\n");
  return `---\n${frontmatter}\n---\n\n${version.markdownContent}\n`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderPromptMarkdown(markdown: string) {
  const escaped = escapeHtml(markdown);
  const rendered = escaped.split(/\r?\n/).map((line) => {
    if (/^### /.test(line)) return `<h3>${line.slice(4)}</h3>`;
    if (/^## /.test(line)) return `<h2>${line.slice(3)}</h2>`;
    if (/^# /.test(line)) return `<h1>${line.slice(2)}</h1>`;
    if (/^[-*] /.test(line)) return `<ul><li>${line.slice(2)}</li></ul>`;
    if (/^\d+\. /.test(line)) return `<ol><li>${line.replace(/^\d+\. /, "")}</li></ol>`;
    if (!line.trim()) return "<br>";
    return `<p>${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`;
  }).join("\n");
  return sanitizeHtml(rendered);
}

export function promptLineDiff(from: string, to: string) {
  const left = from.split(/\r?\n/);
  const right = to.split(/\r?\n/);
  const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) {
    table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const lines: { type: "same" | "added" | "removed"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) { lines.push({ type: "same", text: left[i++] }); j++; }
    else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) lines.push({ type: "added", text: right[j++] });
    else lines.push({ type: "removed", text: left[i++] });
  }
  return lines;
}

export function promptAccessWhere(clientId: string | null): Prisma.PromptTemplateWhereInput {
  return { OR: [{ scope: { in: ["global", "workspace", "industry"] } }, ...(clientId ? [{ scope: "client", clientId }] : [])] };
}

export function canAccessPrompt(template: Pick<PromptTemplate, "scope" | "clientId">, clientId: string | null) {
  return template.scope !== "client" || Boolean(clientId && template.clientId === clientId);
}

export async function resolvePromptForGeneration(input: {
  templateType: string; clientId: string | null; industry?: string | null;
  promptTemplateId?: string | null; promptVersionId?: string | null;
}) {
  if (input.promptVersionId) {
    const version = await prisma.promptVersion.findUnique({ where: { id: input.promptVersionId }, include: { promptTemplate: true } });
    if (!version || version.status !== "approved" || version.promptTemplate.status === "archived" || !canAccessPrompt(version.promptTemplate, input.clientId)) throw new Error("Selected prompt version is unavailable or unauthorized.");
    return version;
  }
  if (input.promptTemplateId) {
    const template = await prisma.promptTemplate.findUnique({ where: { id: input.promptTemplateId } });
    if (!template || !template.currentApprovedVersionId || !canAccessPrompt(template, input.clientId)) throw new Error("Selected prompt has no accessible approved version.");
    return prisma.promptVersion.findUniqueOrThrow({ where: { id: template.currentApprovedVersionId }, include: { promptTemplate: true } });
  }
  const candidates = await prisma.promptTemplate.findMany({
    where: { ...promptAccessWhere(input.clientId), templateType: input.templateType, status: "approved", currentApprovedVersionId: { not: null }, archivedAt: null,
      OR: [{ scope: "client", clientId: input.clientId ?? "" }, { scope: "industry", industry: input.industry ?? "" }, { scope: "workspace" }, { scope: "global" }] },
    orderBy: { updatedAt: "desc" },
  });
  const priority = ["client", "industry", "workspace", "global"];
  for (const scope of priority) {
    const matches = candidates.filter((candidate) => candidate.scope === scope);
    if (matches.length > 1) throw new Error(`Multiple ${scope} prompts match; select one explicitly.`);
    if (matches.length === 1) return prisma.promptVersion.findUniqueOrThrow({ where: { id: matches[0].currentApprovedVersionId! }, include: { promptTemplate: true } });
  }
  return null;
}

export async function assemblePromptVersions(versionIds: string[], clientId: string | null, generationInputs = "") {
  const versions = await prisma.promptVersion.findMany({ where: { id: { in: versionIds } }, include: { promptTemplate: true } });
  const ordered = versionIds.map((id) => versions.find((version) => version.id === id));
  if (ordered.some((version) => !version || version.status !== "approved" || version.promptTemplate.status === "archived" || !canAccessPrompt(version.promptTemplate, clientId))) {
    throw new Error("A prompt component is missing, unapproved, archived, or unauthorized.");
  }
  return assemblePromptText(ordered.map((version) => ({ name: version!.promptTemplate.name, markdown: version!.markdownContent, versionId: version!.id })), generationInputs);
}

export function assemblePromptText(components: { name: string; markdown: string; versionId: string }[], generationInputs = "") {
  const sections = components.map((component) => `# ${component.name.toUpperCase()}\n\n${component.markdown}`);
  if (generationInputs.trim()) sections.push(`# GENERATION INPUTS\n\n${generationInputs}`);
  const assembledPrompt = sections.join("\n\n---\n\n");
  return { assembledPrompt, assembledPromptHash: hashPrompt(assembledPrompt), componentVersionIds: components.map((component) => component.versionId) };
}
