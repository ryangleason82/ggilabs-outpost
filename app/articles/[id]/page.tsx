"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArticlePreview } from "@/components/ArticlePreview";
import { AutoCheckResults } from "@/components/AutoCheckResults";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { FeaturedImageUpload } from "@/components/FeaturedImageUpload";
import {
  MANUAL_CHECKS,
  SERVICE_DETAIL_MANUAL_CHECKS,
  ManualChecklist,
  manualChecksComplete,
} from "@/components/ManualChecklist";
import { StatusBadge } from "@/components/StatusBadge";
import { TechnicalSeoPanel } from "@/components/TechnicalSeoPanel";
import { CSV_HEADERS } from "@/lib/parser";
import { SERVICE_DETAIL_EDIT_GROUPS, SERVICE_DETAIL_FIELDS, SERVICE_DETAIL_HTML_EDIT_GROUPS, SERVICE_DETAIL_HTML_FIELDS } from "@/lib/templates";
import { expectedServicePath, SERVICE_HUB_OPTIONS } from "@/lib/service-hubs";

const longTextFields = new Set([
  "heroSubheading",
  "introSummary",
  "section1Body",
  "section2Body",
  "section3Body",
  "faq1Answer",
  "faq2Answer",
  "faq3Answer",
  "ctaBody",
  "metaDescription",
  ...SERVICE_DETAIL_HTML_FIELDS,
  "html_content",
]);

const editGroups = [
  {
    title: "Post",
    fields: [
      "postTitle",
      "postName",
      "postStatus",
      "postType",
      "templateType",
      "primaryKeyword",
      "serviceName",
      "locationName",
    ],
  },
  {
    title: "Hero and Intro",
    fields: ["heroEyebrow", "heroHeading", "heroSubheading", "introSummary"],
  },
  {
    title: "Sections",
    fields: [
      "section1Heading",
      "section1Body",
      "section2Heading",
      "section2Body",
      "section3Heading",
      "section3Body",
    ],
  },
  {
    title: "FAQs",
    fields: [
      "faq1Question",
      "faq1Answer",
      "faq2Question",
      "faq2Answer",
      "faq3Question",
      "faq3Answer",
    ],
  },
  {
    title: "CTA and Related Hub",
    fields: ["ctaHeading", "ctaBody", "ctaButtonText", "ctaButtonUrl", "relatedHubUrl", "relatedHubAnchor"],
  },
  {
    title: "SEO",
    fields: ["metaTitle", "metaDescription"],
  },
] satisfies { title: string; fields: (typeof CSV_HEADERS)[number][] }[];

export default function ArticleReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Record<string, unknown> | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isServiceDetail = article?.templateType === "service_detail" || article?.template_type === "service_detail";
  const isHtmlServiceDetail = isServiceDetail && (article?.content_format === "html" || Boolean(String(article?.html_content ?? "").trim()));
  const activeFields = isHtmlServiceDetail ? SERVICE_DETAIL_HTML_EDIT_GROUPS.flatMap((group) => group.fields) : isServiceDetail ? SERVICE_DETAIL_FIELDS : CSV_HEADERS;
  const activeGroups = isHtmlServiceDetail ? SERVICE_DETAIL_HTML_EDIT_GROUPS : isServiceDetail ? SERVICE_DETAIL_EDIT_GROUPS : editGroups;
  const expectedPath = isServiceDetail ? expectedServicePath(editFields.service_hub ?? "", editFields.post_name ?? "") : "";

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setArticle(json.article);
        setEditFields(
          Object.fromEntries(
            (json.article.templateType === "service_detail" && (json.article.content_format === "html" || json.article.html_content) ? SERVICE_DETAIL_HTML_EDIT_GROUPS.flatMap((group) => group.fields) : json.article.templateType === "service_detail" ? SERVICE_DETAIL_FIELDS : CSV_HEADERS)
              .map((field) => [field, String(json.article[field] ?? "")]),
          ),
        );
      })
      .catch((err) => setError(String(err)));
  }, [id]);

  const canApprove = useMemo(
    () => (article ? manualChecksComplete(article) && (!isHtmlServiceDetail || !((article.technicalSeo as { errors?: unknown[] } | undefined)?.errors?.length)) : false),
    [article, isHtmlServiceDetail],
  );

  async function saveUpdates(updates: Record<string, unknown>) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? "Save failed");
      return;
    }

    setArticle(json.article);
    setEditFields(
      Object.fromEntries(
        activeFields.map((field) => [field, String(json.article[field] ?? "")]),
      ),
    );
  }

  if (!article) {
    return (
      <div className="p-8 text-sm text-zinc-600">
        {error ? `Could not load article: ${error}` : "Loading..."}
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
      <div className="overflow-y-auto bg-white px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={String(article.status ?? "")} />
              <span className="text-xs text-zinc-500">
                Version {String(article.version ?? "1")}
              </span>
            </div>
            <h1 className="truncate text-xl font-semibold">
              {String(article.postTitle ?? "")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            {editing ? "Preview" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="mx-auto max-w-4xl space-y-8">
            {activeGroups.map((group) => (
              <section key={group.title}>
                <h2 className="mb-3 text-sm font-semibold uppercase text-zinc-500">
                  {group.title}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <label
                      key={field}
                      className={longTextFields.has(field) ? "block md:col-span-2" : "block"}
                    >
                      <span className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                        {field.replaceAll("_", " ")}
                      </span>
                      {field === "service_hub" ? (
                        <>
                          <input list="service-hub-options" value={editFields[field] ?? ""} placeholder="vehicles" onChange={(event) => setEditFields({ ...editFields, [field]: event.target.value.toLowerCase().trim() })} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
                          <datalist id="service-hub-options">
                            {SERVICE_HUB_OPTIONS.map((hub) => <option key={hub.slug} value={hub.slug}>{hub.label}</option>)}
                          </datalist>
                        </>
                      ) : longTextFields.has(field) ? (
                        <textarea
                          value={editFields[field] ?? ""}
                          onChange={(event) =>
                            setEditFields({
                              ...editFields,
                              [field]: event.target.value,
                            })
                          }
                          rows={field.includes("Body") ? 10 : 4}
                          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                        />
                      ) : (
                        <input
                          value={editFields[field] ?? ""}
                          onChange={(event) =>
                            setEditFields({
                              ...editFields,
                              [field]: event.target.value,
                            })
                          }
                          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                        />
                      )}
                    </label>
                  ))}
                </div>
                {(group.fields as readonly string[]).includes("service_hub") && <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm"><span className="font-medium">Expected path: </span><code>{expectedPath || "Select a hub and enter a slug"}</code>{article.publishedUrl ? <p className="mt-1 text-xs text-zinc-500">WordPress URL: {String(article.publishedUrl)}</p> : <p className="mt-1 text-xs text-zinc-500">WordPress remains the canonical URL source after publishing.</p>}</div>}
              </section>
            ))}
            <div className="sticky bottom-0 border-t border-zinc-200 bg-white py-4">
              <button
                type="button"
                onClick={() => void saveUpdates(editFields)}
                disabled={saving}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Edits"}
              </button>
              <button type="button" onClick={() => { setEditing(false); setEditFields(Object.fromEntries(activeFields.map((field) => [field, String(article[field] ?? "")]))); }} className="ml-2 rounded border border-zinc-300 px-4 py-2 text-sm font-medium">Cancel</button>
            </div>
          </div>
        ) : (
          <ArticlePreview article={article} />
        )}
      </div>

      <aside className="overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-6">
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <FeaturedImageUpload
            articleId={id}
            imagePath={
              typeof article.featuredImagePath === "string"
                ? article.featuredImagePath
                : null
            }
            imageFilename={
              typeof article.featuredImageFilename === "string"
                ? article.featuredImageFilename
                : null
            }
            onUploaded={(updatedArticle) => setArticle((current) => current ? { ...current, ...updatedArticle } : updatedArticle)}
          />
        </div>

        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <AutoCheckResults article={article} />
        </div>

        {isHtmlServiceDetail && <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4"><TechnicalSeoPanel result={article.technicalSeo as { errors?: { id: string; message: string }[]; warnings?: { id: string; message: string }[]; passes?: { id: string; message: string }[] } | undefined} /></div>}

        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <ManualChecklist
            key={String(article.updatedAt ?? article.id)}
            article={article}
            saving={saving}
            onSave={(checks) => void saveUpdates(checks)}
          />
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!canApprove || saving}
            onClick={async () => {
              await saveUpdates({ status: "approved" });
              router.push("/queue");
            }}
            className="rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve for Publishing
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveUpdates({ status: "flagged" })}
            className="rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Flag Article
          </button>
          <DeleteArticleButton articleId={id} />
          <button
            type="button"
            onClick={() => router.push("/articles")}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Back to Articles
          </button>
        </div>

        {!canApprove && (
          <p className="mt-3 text-xs text-zinc-500">
            {!manualChecksComplete(article)
              ? `Approval unlocks after all ${isServiceDetail ? SERVICE_DETAIL_MANUAL_CHECKS.length : MANUAL_CHECKS.length} manual checks are saved.`
              : isHtmlServiceDetail && ((article.technicalSeo as { errors?: unknown[] } | undefined)?.errors?.length)
                ? "Approval is blocked by the technical SEO errors shown above."
                : "Save the article review before approving."}
          </p>
        )}
      </aside>
    </div>
  );
}
