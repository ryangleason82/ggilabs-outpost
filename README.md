# GGILabs Outpost

GGILabs Outpost is a local content operations app for moving externally generated GGILabs articles from CSV files into reviewed, approved WordPress Resources drafts.

The app does not generate articles. It handles the downstream workflow: upload CSVs, inspect article content, run basic quality checks, complete a manual review checklist, attach a featured image, create a WordPress Resources draft, set Rank Math SEO metadata, and track local publishing status.

## What This App Does

- Uploads single-article or multi-article CSV exports.
- Maps canonical article fields into a local SQLite database.
- Handles flexible CSV headers such as `section1Body`, `section1_body`, and `section_1_body`.
- Prevents header rows from being imported as articles.
- Runs automated quality checks on upload and after content edits.
- Provides a full article preview screen.
- Allows every article field to be edited before publishing.
- Provides a manual review checklist and quality score.
- Requires articles to be approved before they enter the publishing queue.
- Lets a user upload a featured image per article.
- Uploads the featured image to WordPress Media.
- Creates a WordPress draft in the Resources custom post type.
- Sets the WordPress draft's featured image.
- Sets Rank Math SEO metadata:
  - `primaryKeyword` -> Focus Keyword
  - `metaTitle` -> SEO Title
  - `metaDescription` -> Meta Description
  - Pillar Content -> off
- Saves WordPress post ID, featured media ID, URL, and local status.

## What This App Does Not Do

- It does not generate article content.
- It does not call Anthropic, OpenAI, or any paid AI service.
- It does not publish posts live by default.
- It does not authenticate multiple users.
- It does not replace final WordPress review.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite
- WordPress REST API
- Rank Math REST metadata endpoint

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

If no example file exists, create `.env.local` manually with:

```env
# WordPress
WP_URL=https://ggilabs.com
WP_USERNAME=your_wp_username
WP_APP_PASSWORD=your_wordpress_application_password
WP_RESOURCE_REST_BASE=resources

# Google Search Console, reserved for later performance tracking
GSC_CLIENT_ID=your_gsc_client_id
GSC_CLIENT_SECRET=your_gsc_client_secret
GSC_REFRESH_TOKEN=your_gsc_refresh_token
GSC_PROPERTY_URL=https://ggilabs.com

# Local database
DATABASE_URL="file:./dev.db"
```

Initialize the local SQLite database:

```bash
npm run db:init
npx prisma generate
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## WordPress Requirements

The app expects WordPress to support:

- A Resources custom post type exposed through the REST API.
- Application Password authentication.
- Permission for the configured user to create Resources posts.
- Permission for the configured user to upload Media.
- Rank Math installed and reachable at:

```text
/wp-json/rankmath/v1/updateMeta
```

The app defaults to this REST base:

```env
WP_RESOURCE_REST_BASE=resources
```

If the Resources CPT has a different REST base, update that variable. The app also attempts to discover the Resources REST base from `/wp-json/wp/v2/types`.

## WordPress Application Password

In WordPress:

1. Go to `Users`.
2. Open the user profile that should publish Resources drafts.
3. Find `Application Passwords`.
4. Create a new application password.
5. Put that password in `.env.local` as `WP_APP_PASSWORD`.

Use the generated application password, not the normal WordPress login password.

## CSV Upload Workflow

1. Go to `/upload`.
2. Drop or select a CSV file.
3. The app parses each row as an article.
4. Each article is saved with status `uploaded`.
5. Automated checks run immediately.
6. Uploaded articles can be opened from the upload result or `/articles`.

The expected CSV article fields are:

```text
postTitle
postName
postStatus
postType
templateType
primaryKeyword
serviceName
locationName
heroEyebrow
heroHeading
heroSubheading
introSummary
section1Heading
section1Body
section2Heading
section2Body
section3Heading
section3Body
faq1Question
faq1Answer
faq2Question
faq2Answer
faq3Question
faq3Answer
ctaHeading
ctaBody
ctaButtonText
ctaButtonUrl
relatedHubUrl
relatedHubAnchor
metaTitle
metaDescription
```

Snake case and numbered variants are supported, including:

```text
post_title
primary_keyword
section_1_body
section_2_body
section_3_body
meta_description
```

## Automated Checks

The app currently checks:

- No em dashes or en dashes.
- External links with `nofollow` are present.
- An inline-styled table is present.
- Meta title is 60 characters or less.
- Meta description is 160 characters or less.
- Primary keyword appears in the post title.
- No markdown link artifacts appear in body sections.

These checks run:

- when a CSV is uploaded
- when article content fields are edited

## Review Workflow

Each article has a review page at:

```text
/articles/[id]
```

The review page includes:

- Article preview.
- Full edit mode for all CSV article fields.
- Featured image upload.
- Automated check results.
- Manual review checklist.
- Score field.
- Review notes.
- Approve, flag, delete, and back actions.

Approval is blocked until all manual checklist items are checked and saved.

## Manual Checklist

The checklist covers editorial checks that require human judgment:

- Opinion is explicit and quotable in Section 1.
- Real example has at least two specific details.
- All stats link to specific source pages, not homepages.
- External links have `nofollow` and `target="_blank"`.
- Meta description has proper noun capitalization.
- CTA body is specific to the article topic.
- No paragraph exceeds four sentences.
- Table uses the correct inline-styled HTML template.
- No forced humor.
- Voice sounds contractor-aware, not agency generic.

## Featured Images

On the article review page, use the Featured Image upload box.

Supported formats:

- JPG
- PNG
- WebP

Maximum size:

```text
8MB
```

Images are stored locally in:

```text
public/uploads/
```

That folder is ignored by Git because uploaded images are local working data.

When the article is sent to WordPress:

1. The app uploads the image to `/wp-json/wp/v2/media`.
2. WordPress returns a media ID.
3. The app sends that media ID as `featured_media` on the Resources draft.
4. The local article stores the WordPress media ID.

## Publishing Workflow

1. Upload a CSV.
2. Open an article.
3. Review and edit the content.
4. Upload a featured image if needed.
5. Complete and save the manual checklist.
6. Click `Approve for Publishing`.
7. Go to `/queue`.
8. Click `Send to WordPress`.

The app creates a draft in the Resources custom post type. It does not publish live.

After a successful send:

- local status changes to `published`
- WordPress post ID is saved
- WordPress featured media ID is saved, if an image was uploaded
- WordPress URL is saved
- review notes are updated with the preview URL

## Service Detail Template

Outpost supports the reusable `service_detail` template alongside `spoke`.
Choose **Service Detail** during CSV upload or include
`template_type=service_detail` in each row for automatic detection.

Service-detail records use structured JSON as their canonical payload. The
existing shared Article columns remain populated for lists, search, SEO,
workflow status, and backward compatibility. Imports default to:

```text
post_status = draft
post_type = service
template_type = service_detail
```

The importer validates each row independently, reports row and field errors,
sanitizes HTML-capable fields, and skips duplicate client-scoped slugs without
changing the existing record. `why_sangiuliano_heading` and
`why_sangiuliano_body` are accepted only as legacy CSV aliases for the generic
`trust_heading` and `trust_body` fields.

Allowed HTML includes paragraphs, links, emphasis, lists, tables, table
sections/cells, and line breaks. Scripts, frames, forms, event handlers, data
URLs, and JavaScript URLs are rejected. Safe inline table and cell styles are
preserved.

Publishing converts service-detail payloads into deterministic native
Gutenberg blocks in the documented section order. The configured client
WordPress REST base remains the target post type, and Rank Math metadata uses
the shared SEO integration. Unlike the spoke adapter, service-detail publishing
does not assume ACF, Kadence, Elementor, reusable pattern IDs, or custom field
names.

The canonical CSV headers and editor sections are defined in
`lib/templates.ts`. Required URLs must be absolute HTTPS URLs, meta titles over
60 characters produce warnings, and meta descriptions over 160 characters are
rejected.

## Prompt Library

`/prompts` is the database-backed source of truth for writing prompts. Prompt
Markdown is not hard-coded into UI or publishing code. Each prompt has metadata
and sequential versions with this lifecycle:

```text
Draft -> Approved -> Archived
```

Draft versions can be saved in place. Approved versions are immutable; use
**Create editable draft** to copy an approved or historical version into the
next draft. Approval requires a change summary and atomically updates the
prompt's active approved version. Previous versions remain readable and
exportable. Archiving prevents new resolution or composition without breaking
historical Article provenance.

### Prompt scopes

- `global`: reusable across clients.
- `workspace`: reserved for the current Outpost installation.
- `industry`: reusable guidance selected by industry.
- `client`: visible only while its assigned client is selected.

This installation has no accounts, roles, organizations, or workspaces. The
single local operator has create/edit/approve/archive/import/export/use
capabilities. APIs still enforce selected-client isolation for client prompts;
true per-user approval permissions require a future authentication model.

### Import and export

Use **Prompt Library -> Import Markdown** for `.md` files up to 2 MB. Optional
YAML frontmatter is previewed and may be overridden. Imported approval claims,
IDs, and client assignments are never trusted; imports always create version 1
as a draft. Exports use `{slug}-v{version}.md`, normalized frontmatter, and the
exact stored Markdown body.

### Composition and resolution

Prompt resolution is deterministic: an explicit approved version wins,
followed by explicit composition, client, industry, workspace, and global
scope. Multiple matches at one fallback level return a selection error instead
of choosing silently. Compositions store exact component version IDs in order
and assemble sections with stable separators and a SHA-256 hash.

Conceptual composition:

```text
Global template prompt
+ Industry addendum
+ Client instruction prompt
+ Generation inputs
+ Output schema prompt
```

Client factual knowledge remains separate from prompt instructions. Outpost
does not currently have client-profile versioning or RAG, so source document
and client-profile provenance columns are nullable and ready for those systems.

### Content provenance

CSV upload can select an approved prompt version or composition and record:

- exact template/version/composition and component version IDs;
- assembled prompt hash;
- generation provider and model;
- generation/import timestamp and local operator;
- source filename as generation inputs.

CSV is generated externally today; Outpost does not call a model. Selecting a
prompt during upload records declared generation provenance but does not claim
that Outpost performed generation.

### Seed prompts

Repository defaults live under `prompts/global`, `prompts/industries`, and
optionally `prompts/clients`. Import new seeds idempotently with:

```bash
npm run prompts:seed
```

The seed command never overwrites an existing database prompt. Database edits
remain canonical. Rollback is performed by creating a new draft from a prior
version and approving it, preserving the audit history.

Rendered Markdown preview is sanitized, raw embedded HTML is escaped, prompt
content is not logged, imports are size/type checked, exports use database
slugs rather than filesystem paths, and all prompt APIs are server-scoped.

## Rank Math SEO

After creating the Resources draft, the app calls:

```text
/wp-json/rankmath/v1/updateMeta
```

It sends:

```text
rank_math_focus_keyword = primaryKeyword
rank_math_title = metaTitle
rank_math_description = metaDescription
rank_math_pillar_content = off
```

This mirrors the previous WP All Import Rank Math SEO Add-On mapping:

```text
Focus Keywords -> {primary_keyword}
SEO Title -> {meta_title}
Meta Description -> {meta_description}
This post is Pillar Content -> No
```

## Local Database

The app uses SQLite through Prisma.

The local database file is:

```text
dev.db
```

It is ignored by Git.

To initialize or repair the local database schema:

```bash
npm run db:init
npx prisma generate
```

Prisma migrations are not currently used because Prisma 7's migration engine produced a schema-engine error in this local Windows setup. The app uses `scripts/init-db.mjs` to create or update the local SQLite tables directly.

## Main Routes

```text
/                  Dashboard
/upload            CSV upload
/articles          Article list
/articles/[id]     Preview, edit, review, image upload
/queue             Approved articles ready for WordPress
/library           Published article library
```

## API Routes

```text
POST   /api/upload
GET    /api/articles
GET    /api/articles/[id]
PATCH  /api/articles/[id]
DELETE /api/articles/[id]
POST   /api/articles/[id]/featured-image
POST   /api/publish/[id]
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
npm run db:init
npx prisma generate
```

## Git-Ignored Local Files

The following are intentionally not committed:

```text
.env
.env.local
.next/
node_modules/
dev.db
next-env.d.ts
public/uploads/
```

## Current Scope

The app is currently built for a single local operator. There is no login system, team workflow, or hosted database. It is intended to run locally, publish drafts to GGILabs WordPress, and keep a local operational record of the article workflow.
# Service Page HTML Pipeline

Service pages now have a separate review workflow at `/service-pages`. Upload a Content Engine CSV using the documented service-page columns; each row contains a canonical `html_content` WordPress fragment plus dedicated page and Rank Math metadata. Outpost validates the complete batch atomically, creates one review draft per row, detects links/images/sections, and previews the exact HTML. Users can edit HTML, restore revisions, export a correctly quoted CSV, and create or update WordPress pages without filling out a page-writing form.

Publishing defaults to a WordPress draft. Outpost stores the WordPress post ID and updates it on later publishes. Before an update, Outpost compares the remote modified timestamp and content hash; an external WordPress edit returns a conflict instead of being silently overwritten. The selected site profile’s `wordpressRestBase` defaults to `pages`, and Rank Math metadata is written through its REST endpoint.

Run `npm run db:init` after pulling these changes to create the `SiteProfile`, `ServicePage`, and `ServicePageRevision` tables.
# Service-detail technical SEO publishing

HTML service-detail records are rendered once through the shared service-detail renderer for preview, validation, and WordPress publishing. Published `post_content` contains markup only: saved `<style>` and `<script>` blocks are removed. Install the CSS shown in the Site Profile’s service-detail styling configuration in the WordPress theme or global stylesheet once; the preview injects Outpost’s baseline CSS only inside its sandbox.

Configure the Site Profile with the canonical site URL and a verified provider entity `@id` before enabling Service schema. Outpost will not invent organization facts. Breadcrumb and FAQ schema are derived from their visible page equivalents. The Technical SEO panel blocks publishing on errors and reports non-blocking warnings for optional policy/configuration gaps.

Hero and supporting image URLs must be public HTTPS images with descriptive alt text. On first publish Outpost creates WordPress media attachments and stores their IDs and canonical URLs; later updates reuse those attachments. WordPress supplies intrinsic dimensions and responsive variants when its media response exposes them. A site owner must still ensure the global stylesheet is loaded by the active theme and confirm Rank Math accepts the configured schema meta through its authenticated update endpoint.
