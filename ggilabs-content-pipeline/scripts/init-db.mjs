import Database from "better-sqlite3";

const db = new Database("dev.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS Article (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL,
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
    performanceUpdatedAt DATETIME
  );

  CREATE TABLE IF NOT EXISTS Batch (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filename TEXT NOT NULL,
    articleCount INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'csv_upload'
  );
`);

const articleColumns = db
  .prepare("PRAGMA table_info(Article)")
  .all()
  .map((column) => column.name);

function addArticleColumn(name, definition) {
  if (!articleColumns.includes(name)) {
    db.exec(`ALTER TABLE Article ADD COLUMN ${name} ${definition}`);
  }
}

addArticleColumn("wpFeaturedMediaId", "TEXT");
addArticleColumn("featuredImagePath", "TEXT");
addArticleColumn("featuredImageFilename", "TEXT");

db.close();
