import Database from "better-sqlite3";
import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const db = new Database("dev.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS Client (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    wpUrl TEXT NOT NULL,
    wpUsername TEXT NOT NULL,
    wpAppPassword TEXT NOT NULL,
    wpResourceRestBase TEXT NOT NULL DEFAULT 'resources',
    wpServiceDetailRestBase TEXT NOT NULL DEFAULT 'service-detail-page',
    wpServiceDetailPostType TEXT NOT NULL DEFAULT 'service-detail-page',
    gscPropertyUrl TEXT,
    gscClientId TEXT,
    gscClientSecret TEXT,
    gscRefreshToken TEXT,
    isDefault BOOLEAN NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS Article (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL,
    clientId TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    version INTEGER NOT NULL DEFAULT 1,
    batchName TEXT,
    publishedAt DATETIME,
    scheduledAt DATETIME,
    publishedUrl TEXT,
    wpPostId TEXT,
    wpPostType TEXT,
    wpRestBase TEXT,
    wpFeaturedMediaId TEXT,
    wpHeroMediaId TEXT,
    wpHeroMediaUrl TEXT,
    wpHeroSourceUrl TEXT,
    wpSupportingMediaId TEXT,
    wpSupportingMediaUrl TEXT,
    wpSupportingSourceUrl TEXT,
    featuredImagePath TEXT,
    featuredImageFilename TEXT,
    postTitle TEXT NOT NULL,
    postName TEXT NOT NULL,
    postStatus TEXT NOT NULL DEFAULT 'draft',
    postType TEXT NOT NULL DEFAULT 'education',
    templateType TEXT NOT NULL DEFAULT 'spoke',
    templatePayload TEXT,
    primaryKeyword TEXT NOT NULL,
    serviceName TEXT,
    locationName TEXT,
    heroEyebrow TEXT,
    heroHeading TEXT NOT NULL,
    heroSubheading TEXT NOT NULL,
    introSummary TEXT NOT NULL,
    section1Heading TEXT NOT NULL,
    section1Body TEXT NOT NULL,
    section2Heading TEXT NOT NULL,
    section2Body TEXT NOT NULL,
    section3Heading TEXT NOT NULL,
    section3Body TEXT NOT NULL,
    faq1Question TEXT NOT NULL,
    faq1Answer TEXT NOT NULL,
    faq2Question TEXT NOT NULL,
    faq2Answer TEXT NOT NULL,
    faq3Question TEXT NOT NULL,
    faq3Answer TEXT NOT NULL,
    ctaHeading TEXT NOT NULL,
    ctaBody TEXT NOT NULL,
    ctaButtonText TEXT NOT NULL,
    ctaButtonUrl TEXT NOT NULL,
    relatedHubUrl TEXT NOT NULL,
    relatedHubAnchor TEXT NOT NULL,
    metaTitle TEXT NOT NULL,
    metaDescription TEXT NOT NULL,
    autoNoEmDashes BOOLEAN,
    autoExternalLinksPresent BOOLEAN,
    autoTablePresent BOOLEAN,
    autoMetaLength BOOLEAN,
    autoKeywordInTitle BOOLEAN,
    autoNoMarkdownLinks BOOLEAN,
    checkOpinionInS1 BOOLEAN,
    checkRealExampleSpecific BOOLEAN,
    checkAllStatsLinked BOOLEAN,
    checkExternalLinksCorrect BOOLEAN,
    checkMetaCapsCorrect BOOLEAN,
    checkCtaSpecific BOOLEAN,
    checkParagraphLength BOOLEAN,
    checkTableRendersCorrect BOOLEAN,
    checkNoForcedHumor BOOLEAN,
    checkVoiceContractorAware BOOLEAN,
    overallScore INTEGER,
    reviewNotes TEXT,
    gscClicks30d INTEGER,
    gscImpressions30d INTEGER,
    rankingPosition REAL,
    gscIndexedStatus TEXT,
    gscCoverageState TEXT,
    gscLastCrawlTime DATETIME,
    gscGoogleCanonical TEXT,
    gscUserCanonical TEXT,
    gscRobotsTxtState TEXT,
    gscIndexingState TEXT,
    gscInspectionUpdatedAt DATETIME,
    performanceUpdatedAt DATETIME
  );

  CREATE TABLE IF NOT EXISTS Batch (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clientId TEXT,
    filename TEXT NOT NULL,
    articleCount INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'csv_upload'
  );

  CREATE TABLE IF NOT EXISTS PromptTemplate (
    id TEXT PRIMARY KEY NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL, clientId TEXT, name TEXT NOT NULL, slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '', templateType TEXT NOT NULL, industry TEXT,
    scope TEXT NOT NULL DEFAULT 'client', status TEXT NOT NULL DEFAULT 'draft',
    currentApprovedVersionId TEXT, createdBy TEXT NOT NULL DEFAULT 'local-operator',
    archivedAt DATETIME, lastUsedAt DATETIME, usageCount INTEGER NOT NULL DEFAULT 0,
    importMetadata TEXT, seedSource TEXT, seedHash TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS PromptTemplate_slug_scope_clientId_key ON PromptTemplate(slug, scope, clientId);
  CREATE INDEX IF NOT EXISTS PromptTemplate_clientId_idx ON PromptTemplate(clientId);
  CREATE INDEX IF NOT EXISTS PromptTemplate_templateType_idx ON PromptTemplate(templateType);
  CREATE INDEX IF NOT EXISTS PromptTemplate_scope_idx ON PromptTemplate(scope);
  CREATE INDEX IF NOT EXISTS PromptTemplate_status_idx ON PromptTemplate(status);

  CREATE TABLE IF NOT EXISTS PromptVersion (
    id TEXT PRIMARY KEY NOT NULL, promptTemplateId TEXT NOT NULL, versionNumber INTEGER NOT NULL,
    markdownContent TEXT NOT NULL, changeSummary TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
    contentHash TEXT NOT NULL, createdBy TEXT NOT NULL DEFAULT 'local-operator',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, approvedBy TEXT, approvedAt DATETIME, archivedAt DATETIME
  );
  CREATE UNIQUE INDEX IF NOT EXISTS PromptVersion_promptTemplateId_versionNumber_key ON PromptVersion(promptTemplateId, versionNumber);
  CREATE INDEX IF NOT EXISTS PromptVersion_promptTemplateId_idx ON PromptVersion(promptTemplateId);
  CREATE INDEX IF NOT EXISTS PromptVersion_status_idx ON PromptVersion(status);

  CREATE TABLE IF NOT EXISTS PromptComposition (
    id TEXT PRIMARY KEY NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL, clientId TEXT, name TEXT NOT NULL, templateType TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', createdBy TEXT NOT NULL DEFAULT 'local-operator'
  );
  CREATE INDEX IF NOT EXISTS PromptComposition_clientId_idx ON PromptComposition(clientId);
  CREATE TABLE IF NOT EXISTS PromptCompositionItem (
    id TEXT PRIMARY KEY NOT NULL, compositionId TEXT NOT NULL, promptTemplateId TEXT NOT NULL,
    promptVersionId TEXT NOT NULL, position INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'custom',
    isRequired BOOLEAN NOT NULL DEFAULT 1
  );
  CREATE UNIQUE INDEX IF NOT EXISTS PromptCompositionItem_compositionId_position_key ON PromptCompositionItem(compositionId, position);

  CREATE TABLE IF NOT EXISTS SiteProfile (
    id TEXT PRIMARY KEY NOT NULL, clientId TEXT NOT NULL UNIQUE, businessName TEXT NOT NULL,
    domain TEXT NOT NULL, brandJson TEXT NOT NULL, templateJson TEXT NOT NULL,
    internalLinksJson TEXT NOT NULL, seoPlugin TEXT NOT NULL DEFAULT 'rank_math',
    wordpressRestBase TEXT NOT NULL DEFAULT 'pages', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ServicePage (
    id TEXT PRIMARY KEY NOT NULL, clientId TEXT NOT NULL, pageType TEXT NOT NULL DEFAULT 'service',
    title TEXT NOT NULL, slug TEXT NOT NULL, primaryKeyword TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated', currentRevisionId TEXT, wordpressPostId TEXT,
    wordpressUrl TEXT, wordpressStatus TEXT, lastPublishedAt DATETIME,
    lastWordpressModified TEXT, lastPublishedHash TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ServicePage_clientId_slug_key ON ServicePage(clientId, slug);
  CREATE INDEX IF NOT EXISTS ServicePage_clientId_idx ON ServicePage(clientId);
  CREATE TABLE IF NOT EXISTS ServicePageRevision (
    id TEXT PRIMARY KEY NOT NULL, servicePageId TEXT NOT NULL, revisionNumber INTEGER NOT NULL,
    inputsJson TEXT NOT NULL, html TEXT NOT NULL, seoJson TEXT NOT NULL,
    validationJson TEXT NOT NULL, sectionsJson TEXT NOT NULL,
    createdBy TEXT NOT NULL DEFAULT 'local-operator', source TEXT NOT NULL DEFAULT 'generated',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (servicePageId) REFERENCES ServicePage(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ServicePageRevision_servicePageId_revisionNumber_key ON ServicePageRevision(servicePageId, revisionNumber);
  CREATE INDEX IF NOT EXISTS ServicePageRevision_servicePageId_idx ON ServicePageRevision(servicePageId);
`);

const articleColumns = db
  .prepare("PRAGMA table_info(Article)")
  .all()
  .map((column) => column.name);
const batchColumns = db
  .prepare("PRAGMA table_info(Batch)")
  .all()
  .map((column) => column.name);
const clientColumns = db
  .prepare("PRAGMA table_info(Client)")
  .all()
  .map((column) => column.name);

function addArticleColumn(name, definition) {
  if (!articleColumns.includes(name)) {
    db.exec(`ALTER TABLE Article ADD COLUMN ${name} ${definition}`);
  }
}

function addBatchColumn(name, definition) {
  if (!batchColumns.includes(name)) {
    db.exec(`ALTER TABLE Batch ADD COLUMN ${name} ${definition}`);
  }
}

function addClientColumn(name, definition) {
  if (!clientColumns.includes(name)) {
    db.exec(`ALTER TABLE Client ADD COLUMN ${name} ${definition}`);
  }
}

addArticleColumn("clientId", "TEXT");
addArticleColumn("scheduledAt", "DATETIME");
addArticleColumn("wpFeaturedMediaId", "TEXT");
addArticleColumn("wpHeroMediaId", "TEXT");
addArticleColumn("wpHeroMediaUrl", "TEXT");
addArticleColumn("wpHeroSourceUrl", "TEXT");
addArticleColumn("wpSupportingMediaId", "TEXT");
addArticleColumn("wpSupportingMediaUrl", "TEXT");
addArticleColumn("wpSupportingSourceUrl", "TEXT");
addArticleColumn("wpPostType", "TEXT");
addArticleColumn("wpRestBase", "TEXT");
addArticleColumn("featuredImagePath", "TEXT");
addArticleColumn("featuredImageFilename", "TEXT");
addArticleColumn("templatePayload", "TEXT");
addArticleColumn("promptTemplateId", "TEXT");
addArticleColumn("promptVersionId", "TEXT");
addArticleColumn("promptCompositionId", "TEXT");
addArticleColumn("promptComponentVersionIds", "TEXT");
addArticleColumn("assembledPromptHash", "TEXT");
addArticleColumn("generationModel", "TEXT");
addArticleColumn("generationProvider", "TEXT");
addArticleColumn("generationTimestamp", "DATETIME");
addArticleColumn("generatedBy", "TEXT");
addArticleColumn("sourceDocumentIds", "TEXT");
addArticleColumn("clientProfileVersion", "TEXT");
addArticleColumn("generationInputs", "TEXT");
addArticleColumn("gscIndexedStatus", "TEXT");
addArticleColumn("gscCoverageState", "TEXT");
addArticleColumn("gscLastCrawlTime", "DATETIME");
addArticleColumn("gscGoogleCanonical", "TEXT");
addArticleColumn("gscUserCanonical", "TEXT");
addArticleColumn("gscRobotsTxtState", "TEXT");
addArticleColumn("gscIndexingState", "TEXT");
addArticleColumn("gscInspectionUpdatedAt", "DATETIME");
addBatchColumn("clientId", "TEXT");
addClientColumn("gscPropertyUrl", "TEXT");
addClientColumn("gscClientId", "TEXT");
addClientColumn("gscClientSecret", "TEXT");
addClientColumn("gscRefreshToken", "TEXT");
addClientColumn("wpServiceDetailRestBase", "TEXT NOT NULL DEFAULT 'service-detail-page'");
addClientColumn("wpServiceDetailPostType", "TEXT NOT NULL DEFAULT 'service-detail-page'");

const clientConfigPath = path.join(process.cwd(), "config", "clients.local.json");

try {
  const clientConfig = JSON.parse(await readFile(clientConfigPath, "utf8"));
  const configuredClients = Array.isArray(clientConfig.clients)
    ? clientConfig.clients
    : [];

  const upsertClient = db.prepare(`
    INSERT INTO Client (
      id, name, wpUrl, wpUsername, wpAppPassword, wpResourceRestBase,
      wpServiceDetailRestBase, wpServiceDetailPostType,
      gscPropertyUrl, gscClientId, gscClientSecret, gscRefreshToken, isDefault
    ) VALUES (
      @id, @name, @wpUrl, @wpUsername, @wpAppPassword, @wpResourceRestBase,
      @wpServiceDetailRestBase, @wpServiceDetailPostType,
      @gscPropertyUrl, @gscClientId, @gscClientSecret, @gscRefreshToken, @isDefault
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      wpUrl = excluded.wpUrl,
      wpUsername = excluded.wpUsername,
      wpAppPassword = excluded.wpAppPassword,
      wpResourceRestBase = excluded.wpResourceRestBase,
      wpServiceDetailRestBase = excluded.wpServiceDetailRestBase,
      wpServiceDetailPostType = excluded.wpServiceDetailPostType,
      gscPropertyUrl = excluded.gscPropertyUrl,
      gscClientId = excluded.gscClientId,
      gscClientSecret = excluded.gscClientSecret,
      gscRefreshToken = excluded.gscRefreshToken,
      isDefault = excluded.isDefault,
      updatedAt = CURRENT_TIMESTAMP
  `);

  const importClients = db.transaction((clients) => {
    if (clients.some((client) => Boolean(client.isDefault))) {
      db.prepare("UPDATE Client SET isDefault = 0").run();
    }

    for (const client of clients) {
      if (!client.id || !client.name || !client.wpUrl || !client.wpUsername) continue;
      upsertClient.run({
        id: String(client.id),
        name: String(client.name),
        wpUrl: String(client.wpUrl).replace(/\/$/, ""),
        wpUsername: String(client.wpUsername),
        wpAppPassword: String(client.wpAppPassword ?? ""),
        wpResourceRestBase: String(client.wpResourceRestBase ?? "resources"),
        wpServiceDetailRestBase: String(client.wpServiceDetailRestBase ?? "service-detail-page"),
        wpServiceDetailPostType: String(client.wpServiceDetailPostType ?? "service-detail-page"),
        gscPropertyUrl: client.gscPropertyUrl || null,
        gscClientId: client.gscClientId || null,
        gscClientSecret: client.gscClientSecret || null,
        gscRefreshToken: client.gscRefreshToken || null,
        isDefault: client.isDefault ? 1 : 0,
      });
    }
  });

  importClients(configuredClients);
  console.log(`Loaded ${configuredClients.length} client(s) from config/clients.local.json.`);
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw new Error(`Could not load config/clients.local.json: ${error.message}`);
  }
}

let existingDefault = db
  .prepare("SELECT id FROM Client WHERE isDefault = 1 ORDER BY createdAt ASC LIMIT 1")
  .get();

if (!existingDefault) {
  const firstClient = db
    .prepare("SELECT id FROM Client ORDER BY createdAt ASC LIMIT 1")
    .get();

  if (firstClient) {
    db.prepare("UPDATE Client SET isDefault = 1 WHERE id = ?").run(firstClient.id);
    existingDefault = firstClient;
  }
}

const defaultClientId = existingDefault?.id ?? "default-ggilabs";

if (!existingDefault) {
  db.prepare(
    `INSERT INTO Client (
      id,
      name,
      wpUrl,
      wpUsername,
      wpAppPassword,
      wpResourceRestBase,
      gscPropertyUrl,
      gscClientId,
      gscClientSecret,
      gscRefreshToken,
      isDefault
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    defaultClientId,
    "GGILabs",
    process.env.WP_URL ?? "https://ggilabs.com",
    process.env.WP_USERNAME ?? "",
    process.env.WP_APP_PASSWORD ?? "",
    process.env.WP_RESOURCE_REST_BASE ?? "resources",
    process.env.GSC_PROPERTY_URL ?? "",
    process.env.GSC_CLIENT_ID ?? "",
    process.env.GSC_CLIENT_SECRET ?? "",
    process.env.GSC_REFRESH_TOKEN ?? "",
  );
} else {
  db.prepare(
    `UPDATE Client
     SET
       wpUrl = CASE WHEN wpUrl = '' THEN ? ELSE wpUrl END,
       wpUsername = CASE WHEN wpUsername = '' THEN ? ELSE wpUsername END,
       wpAppPassword = CASE WHEN wpAppPassword = '' THEN ? ELSE wpAppPassword END,
       wpResourceRestBase = CASE WHEN wpResourceRestBase = '' THEN ? ELSE wpResourceRestBase END,
       gscPropertyUrl = CASE WHEN gscPropertyUrl IS NULL OR gscPropertyUrl = '' THEN ? ELSE gscPropertyUrl END,
       gscClientId = CASE WHEN gscClientId IS NULL OR gscClientId = '' THEN ? ELSE gscClientId END,
       gscClientSecret = CASE WHEN gscClientSecret IS NULL OR gscClientSecret = '' THEN ? ELSE gscClientSecret END,
       gscRefreshToken = CASE WHEN gscRefreshToken IS NULL OR gscRefreshToken = '' THEN ? ELSE gscRefreshToken END
     WHERE id = ?`,
  ).run(
    process.env.WP_URL ?? "https://ggilabs.com",
    process.env.WP_USERNAME ?? "",
    process.env.WP_APP_PASSWORD ?? "",
    process.env.WP_RESOURCE_REST_BASE ?? "resources",
    process.env.GSC_PROPERTY_URL ?? "",
    process.env.GSC_CLIENT_ID ?? "",
    process.env.GSC_CLIENT_SECRET ?? "",
    process.env.GSC_REFRESH_TOKEN ?? "",
    defaultClientId,
  );
}

db.prepare("UPDATE Article SET clientId = ? WHERE clientId IS NULL OR clientId = ''").run(
  defaultClientId,
);
db.prepare("UPDATE Batch SET clientId = ? WHERE clientId IS NULL OR clientId = ''").run(
  defaultClientId,
);

db.close();
