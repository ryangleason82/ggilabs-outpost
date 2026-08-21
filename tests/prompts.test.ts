import test from "node:test";
import assert from "node:assert/strict";
import {
  assemblePromptText, canAccessPrompt, exportPromptMarkdown, hashPrompt,
  parsePromptMarkdown, promptLineDiff, renderPromptMarkdown, safePromptSlug,
} from "@/lib/prompts";

test("imports frontmatter without trusting or retaining it in Markdown", () => {
  const parsed = parsePromptMarkdown("---\nname: Résumé Prompt\nstatus: approved\nunknown: preserved\n---\n\n# Instructions\n\nWrite clearly.");
  assert.equal(parsed.metadata.status, "approved");
  assert.equal(parsed.metadata.unknown, "preserved");
  assert.equal(parsed.markdown, "# Instructions\n\nWrite clearly.");
});

test("renders Markdown preview without executing raw HTML", () => {
  const html = renderPromptMarkdown("# Safe\n\n<script>alert(1)</script>\n\n**Bold**");
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /<h1>Safe<\/h1>/);
  assert.match(html, /<strong>Bold<\/strong>/);
});

test("scope access prevents cross-client prompt reads", () => {
  assert.equal(canAccessPrompt({ scope: "client", clientId: "a" }, "a"), true);
  assert.equal(canAccessPrompt({ scope: "client", clientId: "a" }, "b"), false);
  assert.equal(canAccessPrompt({ scope: "global", clientId: null }, "b"), true);
});

test("composition preserves order, exact versions, and stable hash", () => {
  const components = [
    { name: "Core template", markdown: "Core", versionId: "v1" },
    { name: "Industry guidance", markdown: "Industry", versionId: "v2" },
    { name: "Output schema", markdown: "Schema", versionId: "v3" },
  ];
  const first = assemblePromptText(components, "Topic: Example");
  const second = assemblePromptText(components, "Topic: Example");
  assert.deepEqual(first.componentVersionIds, ["v1", "v2", "v3"]);
  assert.ok(first.assembledPrompt.indexOf("CORE TEMPLATE") < first.assembledPrompt.indexOf("INDUSTRY GUIDANCE"));
  assert.equal(first.assembledPromptHash, second.assembledPromptHash);
  assert.notEqual(first.assembledPromptHash, hashPrompt("different"));
});

test("raw Markdown diff reports added and removed lines", () => {
  const diff = promptLineDiff("one\ntwo", "one\nthree");
  assert.deepEqual(diff.map((line) => line.type), ["same", "added", "removed"]);
});

test("export round trip preserves exact Unicode Markdown", () => {
  const markdown = "# Café\n\nRésumé guidance — exact.";
  const template = { name: "Unicode", slug: safePromptSlug("Unicode Prompt"), description: "", templateType: "spoke", scope: "global", industry: null, createdAt: new Date(), updatedAt: new Date(), id: "t", clientId: null, status: "approved", currentApprovedVersionId: "v", createdBy: "test", archivedAt: null, lastUsedAt: null, usageCount: 0, importMetadata: null, seedSource: null, seedHash: null };
  const version = { id: "v", promptTemplateId: "t", versionNumber: 1, markdownContent: markdown, changeSummary: "Initial", status: "approved", contentHash: hashPrompt(markdown), createdBy: "test", createdAt: new Date(), approvedBy: "test", approvedAt: new Date(), archivedAt: null };
  const exported = exportPromptMarkdown(template, version);
  assert.equal(parsePromptMarkdown(exported).markdown, markdown);
});
