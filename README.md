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
