import Database from "better-sqlite3";
import nextEnv from "@next/env";

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
    publishedUrl TEXT,
    wpPostId TEXT,
    wpFeaturedMediaId TEXT,
    featuredImagePath TEXT,
    featuredImageFilename TEXT,
    postTitle TEXT NOT NULL,
    postName TEXT NOT NULL,
    postStatus TEXT NOT NULL DEFAULT 'draft',
    postType TEXT NOT NULL DEFAULT 'education',
    templateType TEXT NOT NULL DEFAULT 'spoke',
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
addArticleColumn("wpFeaturedMediaId", "TEXT");
addArticleColumn("featuredImagePath", "TEXT");
addArticleColumn("featuredImageFilename", "TEXT");
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

const existingDefault = db
  .prepare("SELECT id FROM Client WHERE isDefault = 1 ORDER BY createdAt ASC LIMIT 1")
  .get();

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
