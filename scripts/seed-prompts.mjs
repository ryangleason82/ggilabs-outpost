import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "prompts");
const db = new Database(path.join(process.cwd(), "dev.db"));
async function files(directory) { try { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith(".md") ? [path.join(directory, entry.name)] : []))).flat(); } catch { return []; } }
function parse(source) { const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/); const metadata = {}; if (match) for (const line of match[1].split(/\r?\n/)) { const index = line.indexOf(":"); if (index > 0) metadata[line.slice(0, index).trim()] = line.slice(index + 1).trim(); } return { metadata, markdown: (match ? source.slice(match[0].length) : source).trim() }; }
let created = 0;
for (const filename of await files(root)) {
  const source = await readFile(filename, "utf8"); const { metadata, markdown } = parse(source); const seedHash = createHash("sha256").update(source).digest("hex");
  if (!metadata.slug || !metadata.name || !markdown || metadata.scope === "client") continue;
  const existing = db.prepare("SELECT id FROM PromptTemplate WHERE slug = ? AND scope = ? AND clientId IS NULL").get(metadata.slug, metadata.scope ?? "global");
  if (existing) continue;
  const templateId = randomUUID(); const versionId = randomUUID(); const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("INSERT INTO PromptTemplate (id,createdAt,updatedAt,name,slug,description,templateType,industry,scope,status,currentApprovedVersionId,createdBy,seedSource,seedHash) VALUES (?,?,?,?,?,?,?,?,?,'draft',NULL,'seed',?,?)").run(templateId, now, now, metadata.name, metadata.slug, metadata.description ?? "", metadata.template_type ?? "spoke", metadata.industry || null, metadata.scope ?? "global", path.relative(process.cwd(), filename), seedHash);
    db.prepare("INSERT INTO PromptVersion (id,promptTemplateId,versionNumber,markdownContent,changeSummary,status,contentHash,createdBy,createdAt) VALUES (?,?,1,?,'Seed import','draft',?,'seed',?)").run(versionId, templateId, markdown, createHash("sha256").update(markdown).digest("hex"), now);
  })(); created++;
}
db.close(); console.log(`Created ${created} prompt seed(s); existing database prompts were not changed.`);
