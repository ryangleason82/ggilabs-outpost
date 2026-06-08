import Link from "next/link";

const steps = [
  {
    title: "Upload the article CSV",
    body: "Start with a single-article or multi-article CSV from the canonical article prompt. The Outpost parses each row, stores the article locally, and runs the automated quality checks.",
  },
  {
    title: "Review and edit the article",
    body: "Open the article from All Articles or the upload result. Check the post fields, hero copy, sections, FAQs, CTA, related hub, and SEO fields before approving anything for WordPress.",
  },
  {
    title: "Add a featured image",
    body: "Upload a JPG, PNG, or WebP featured image from the article review page. The image is stored locally first, then uploaded to WordPress Media during publishing.",
  },
  {
    title: "Complete the checklist",
    body: "Work through the manual review checklist and notes. Every checklist item must be complete before the article can move into the approved publishing queue.",
  },
  {
    title: "Approve the article",
    body: "Once the content, image, automated checks, and manual review are ready, approve the article. Approved articles appear in the Publishing Queue.",
  },
  {
    title: "Send the draft to WordPress",
    body: "From the Publishing Queue, choose Send to WordPress. The Outpost creates a Resources draft, uploads the featured image when present, assigns it to the draft, and stores the WordPress IDs and URLs locally.",
  },
  {
    title: "Verify the WordPress draft",
    body: "In WordPress, confirm the Resources draft exists, the featured image is set, and Rank Math has the focus keyword, SEO title, and meta description. The draft is not published live automatically.",
  },
];

export default function HowToPage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          The Outpost workflow
        </p>
        <h1 className="text-2xl font-semibold">How to publish an article to WordPress</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Follow this sequence to move reviewed CSV content into WordPress as a
          Resources draft with featured media and Rank Math metadata.
        </p>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {steps.map((step, index) => (
          <section
            key={step.title}
            className="grid gap-4 border-b border-zinc-100 p-5 last:border-b-0 sm:grid-cols-[3rem_1fr]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <h2 className="text-base font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{step.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/upload"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Upload CSV
        </Link>
        <Link
          href="/queue"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Open Publishing Queue
        </Link>
      </div>
    </div>
  );
}
