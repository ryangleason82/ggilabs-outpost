CREATE TABLE `Article` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	`clientId` text,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`batchName` text,
	`publishedAt` integer,
	`scheduledAt` integer,
	`publishedUrl` text,
	`wpPostId` text,
	`wpPostType` text,
	`wpRestBase` text,
	`wpFeaturedMediaId` text,
	`wpHeroMediaId` text,
	`wpHeroMediaUrl` text,
	`wpHeroSourceUrl` text,
	`wpSupportingMediaId` text,
	`wpSupportingMediaUrl` text,
	`wpSupportingSourceUrl` text,
	`featuredImagePath` text,
	`featuredImageFilename` text,
	`postTitle` text NOT NULL,
	`postName` text NOT NULL,
	`postStatus` text DEFAULT 'draft' NOT NULL,
	`postType` text DEFAULT 'education' NOT NULL,
	`templateType` text DEFAULT 'spoke' NOT NULL,
	`templatePayload` text,
	`promptTemplateId` text,
	`promptVersionId` text,
	`promptCompositionId` text,
	`promptComponentVersionIds` text,
	`assembledPromptHash` text,
	`generationModel` text,
	`generationProvider` text,
	`generationTimestamp` integer,
	`generatedBy` text,
	`sourceDocumentIds` text,
	`clientProfileVersion` text,
	`generationInputs` text,
	`primaryKeyword` text NOT NULL,
	`serviceName` text,
	`locationName` text,
	`heroEyebrow` text,
	`heroHeading` text NOT NULL,
	`heroSubheading` text NOT NULL,
	`introSummary` text NOT NULL,
	`section1Heading` text NOT NULL,
	`section1Body` text NOT NULL,
	`section2Heading` text NOT NULL,
	`section2Body` text NOT NULL,
	`section3Heading` text NOT NULL,
	`section3Body` text NOT NULL,
	`faq1Question` text NOT NULL,
	`faq1Answer` text NOT NULL,
	`faq2Question` text NOT NULL,
	`faq2Answer` text NOT NULL,
	`faq3Question` text NOT NULL,
	`faq3Answer` text NOT NULL,
	`ctaHeading` text NOT NULL,
	`ctaBody` text NOT NULL,
	`ctaButtonText` text NOT NULL,
	`ctaButtonUrl` text NOT NULL,
	`relatedHubUrl` text NOT NULL,
	`relatedHubAnchor` text NOT NULL,
	`metaTitle` text NOT NULL,
	`metaDescription` text NOT NULL,
	`autoNoEmDashes` integer,
	`autoExternalLinksPresent` integer,
	`autoTablePresent` integer,
	`autoMetaLength` integer,
	`autoKeywordInTitle` integer,
	`autoNoMarkdownLinks` integer,
	`checkOpinionInS1` integer,
	`checkRealExampleSpecific` integer,
	`checkAllStatsLinked` integer,
	`checkExternalLinksCorrect` integer,
	`checkMetaCapsCorrect` integer,
	`checkCtaSpecific` integer,
	`checkParagraphLength` integer,
	`checkTableRendersCorrect` integer,
	`checkNoForcedHumor` integer,
	`checkVoiceContractorAware` integer,
	`overallScore` integer,
	`reviewNotes` text,
	`gscClicks30d` integer,
	`gscImpressions30d` integer,
	`rankingPosition` real,
	`gscIndexedStatus` text,
	`gscCoverageState` text,
	`gscLastCrawlTime` integer,
	`gscGoogleCanonical` text,
	`gscUserCanonical` text,
	`gscRobotsTxtState` text,
	`gscIndexingState` text,
	`gscInspectionUpdatedAt` integer,
	`performanceUpdatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `Batch` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`clientId` text,
	`filename` text NOT NULL,
	`articleCount` integer NOT NULL,
	`source` text DEFAULT 'csv_upload' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Client` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	`name` text NOT NULL,
	`wpUrl` text NOT NULL,
	`wpUsername` text NOT NULL,
	`wpAppPassword` text NOT NULL,
	`wpResourceRestBase` text DEFAULT 'resources' NOT NULL,
	`wpServiceDetailRestBase` text DEFAULT 'service-detail-page' NOT NULL,
	`wpServiceDetailPostType` text DEFAULT 'service-detail-page' NOT NULL,
	`gscPropertyUrl` text,
	`gscClientId` text,
	`gscClientSecret` text,
	`gscRefreshToken` text,
	`isDefault` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `PromptComposition` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	`clientId` text,
	`name` text NOT NULL,
	`templateType` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdBy` text DEFAULT 'local-operator' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `PromptCompositionItem` (
	`id` text PRIMARY KEY NOT NULL,
	`compositionId` text NOT NULL,
	`promptTemplateId` text NOT NULL,
	`promptVersionId` text NOT NULL,
	`position` integer NOT NULL,
	`role` text DEFAULT 'custom' NOT NULL,
	`isRequired` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PromptCompositionItem_compositionId_position_key` ON `PromptCompositionItem` (`compositionId`,`position`);--> statement-breakpoint
CREATE TABLE `PromptTemplate` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL,
	`clientId` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`templateType` text NOT NULL,
	`industry` text,
	`scope` text DEFAULT 'client' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`currentApprovedVersionId` text,
	`createdBy` text DEFAULT 'local-operator' NOT NULL,
	`archivedAt` integer,
	`lastUsedAt` integer,
	`usageCount` integer DEFAULT 0 NOT NULL,
	`importMetadata` text,
	`seedSource` text,
	`seedHash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PromptTemplate_slug_scope_clientId_key` ON `PromptTemplate` (`slug`,`scope`,`clientId`);--> statement-breakpoint
CREATE TABLE `PromptVersion` (
	`id` text PRIMARY KEY NOT NULL,
	`promptTemplateId` text NOT NULL,
	`versionNumber` integer NOT NULL,
	`markdownContent` text NOT NULL,
	`changeSummary` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`contentHash` text NOT NULL,
	`createdBy` text DEFAULT 'local-operator' NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`approvedBy` text,
	`approvedAt` integer,
	`archivedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PromptVersion_promptTemplateId_versionNumber_key` ON `PromptVersion` (`promptTemplateId`,`versionNumber`);--> statement-breakpoint
CREATE TABLE `ServicePage` (
	`id` text PRIMARY KEY NOT NULL,
	`clientId` text NOT NULL,
	`pageType` text DEFAULT 'service' NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`primaryKeyword` text NOT NULL,
	`status` text DEFAULT 'generated' NOT NULL,
	`currentRevisionId` text,
	`wordpressPostId` text,
	`wordpressUrl` text,
	`wordpressStatus` text,
	`lastPublishedAt` integer,
	`lastWordpressModified` text,
	`lastPublishedHash` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ServicePage_clientId_slug_key` ON `ServicePage` (`clientId`,`slug`);--> statement-breakpoint
CREATE TABLE `ServicePageRevision` (
	`id` text PRIMARY KEY NOT NULL,
	`servicePageId` text NOT NULL,
	`revisionNumber` integer NOT NULL,
	`inputsJson` text NOT NULL,
	`html` text NOT NULL,
	`seoJson` text NOT NULL,
	`validationJson` text NOT NULL,
	`sectionsJson` text NOT NULL,
	`createdBy` text DEFAULT 'local-operator' NOT NULL,
	`source` text DEFAULT 'generated' NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ServicePageRevision_servicePageId_revisionNumber_key` ON `ServicePageRevision` (`servicePageId`,`revisionNumber`);--> statement-breakpoint
CREATE TABLE `SiteProfile` (
	`id` text PRIMARY KEY NOT NULL,
	`clientId` text NOT NULL,
	`businessName` text NOT NULL,
	`domain` text NOT NULL,
	`brandJson` text NOT NULL,
	`templateJson` text NOT NULL,
	`internalLinksJson` text NOT NULL,
	`seoPlugin` text DEFAULT 'rank_math' NOT NULL,
	`wordpressRestBase` text DEFAULT 'pages' NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SiteProfile_clientId_key` ON `SiteProfile` (`clientId`);--> statement-breakpoint
CREATE TABLE `OutpostMigration` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`manifestJson` text NOT NULL
);
