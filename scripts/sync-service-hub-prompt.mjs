import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import Database from "better-sqlite3";

const source = await readFile("prompts/global/generic-service-detail.md", "utf8");
const markdown = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
const contentHash = createHash("sha256").update(markdown).digest("hex");
const db = new Database("dev.db");
const template = db.prepare("SELECT id FROM PromptTemplate WHERE slug = ? AND scope = ? AND clientId IS NULL").get("generic-service-detail-foundation", "global");

if (!template) {
  throw new Error("Generic Service Detail Foundation prompt is not installed.");
}

const latest = db.prepare("SELECT versionNumber, contentHash FROM PromptVersion WHERE promptTemplateId = ? ORDER BY versionNumber DESC LIMIT 1").get(template.id);
if (latest?.contentHash === contentHash) {
  console.log("Prompt draft already matches the service-hub source.");
} else {
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("INSERT INTO PromptVersion (id,promptTemplateId,versionNumber,markdownContent,changeSummary,status,contentHash,createdBy,createdAt) VALUES (?,?,?,?,?,'draft',?,'local-operator',?)")
      .run(randomUUID(), template.id, Number(latest?.versionNumber ?? 0) + 1, markdown, "Add required multi-hub service_detail architecture", contentHash, now);
    db.prepare("UPDATE PromptTemplate SET updatedAt = ? WHERE id = ?").run(now, template.id);
  })();
  console.log(`Created Generic Service Detail Foundation draft v${Number(latest?.versionNumber ?? 0) + 1}.`);
}

db.close();
