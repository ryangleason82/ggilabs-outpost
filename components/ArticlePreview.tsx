"use client";
import Image from "next/image";
import { useState } from "react";
import { renderServiceDetail, type ServiceDetailSeoConfig } from "@/lib/service-detail-render";
import type { ServiceDetailPayload } from "@/lib/templates";

function Html({ value }: { value: unknown }) {
  if (!String(value ?? "").trim()) return null;
  return <div className="article-body text-zinc-700" dangerouslySetInnerHTML={{ __html: String(value) }} />;
}

function ServiceDetailPreview({ article }: { article: Record<string, unknown> }) {
  const [previewWidth, setPreviewWidth] = useState("100%");
  if (String(article.content_format ?? "") === "html" || String(article.html_content ?? "").trim()) {
    const rendered = renderServiceDetail(article as unknown as ServiceDetailPayload, article.serviceDetailSeoConfig as ServiceDetailSeoConfig | undefined);
    return <div className="min-w-0"><div className="mb-3 flex gap-2"><button type="button" onClick={()=>setPreviewWidth("1440px")} className="rounded border px-3 py-1.5 text-xs">Desktop</button><button type="button" onClick={()=>setPreviewWidth("768px")} className="rounded border px-3 py-1.5 text-xs">Tablet</button><button type="button" onClick={()=>setPreviewWidth("390px")} className="rounded border px-3 py-1.5 text-xs">Mobile</button></div><div className="overflow-auto rounded border bg-zinc-100 p-4"><iframe title="Service detail HTML preview" sandbox="" srcDoc={rendered.previewHtml} style={{ width: previewWidth }} className="mx-auto min-h-[800px] max-w-full border bg-white"/></div></div>;
  }
  const sections = [
    ["intro_heading", ["intro_body"]],
    ["signs_heading", ["signs_intro", "signs_list"]],
    ["service_overview_heading", ["service_overview_body"]],
    ["process_heading", ["process_intro", "process_steps"]],
    ["decision_heading", ["decision_body", "decision_table"]],
    ["trust_heading", ["trust_body"]],
    ["local_heading", ["local_body"]],
  ] as const;
  return (
    <article className="mx-auto max-w-3xl bg-white">
      <header className="mb-10 rounded-xl bg-zinc-950 p-8 text-white">
        {Boolean(article.hero_eyebrow) && <p className="mb-2 text-sm font-medium uppercase text-zinc-400">{String(article.hero_eyebrow)}</p>}
        <h1 className="text-3xl font-semibold leading-tight">{String(article.hero_heading ?? article.post_title ?? "")}</h1>
        <p className="mt-4 leading-7 text-zinc-300">{String(article.hero_subheading ?? "")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={String(article.hero_primary_cta_url)} className="rounded bg-white px-4 py-2 text-sm font-medium text-zinc-950">{String(article.hero_primary_cta_text)}</a>
          {Boolean(article.hero_secondary_cta_text && article.hero_secondary_cta_url) && <a href={String(article.hero_secondary_cta_url)} className="rounded border border-zinc-600 px-4 py-2 text-sm font-medium">{String(article.hero_secondary_cta_text)}</a>}
        </div>
      </header>
      <section className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <p><span className="font-medium">Service:</span> {String(article.service_name ?? "")}</p>
        <p><span className="font-medium">Availability:</span> {String(article.location_name ?? "")}</p>
        <p><span className="font-medium">Keyword:</span> {String(article.primary_keyword ?? "")}</p>
        <p><span className="font-medium">Meta title:</span> {String(article.meta_title ?? "")}</p>
        <p><span className="font-medium">Meta description:</span> {String(article.meta_description ?? "")}</p>
      </section>
      {sections.map(([heading, bodies]) => {
        const visible = Boolean(article[heading]) || bodies.some((field) => Boolean(article[field]));
        if (!visible) return null;
        return <section key={heading} className="mb-10 border-t border-zinc-200 pt-8">
          {Boolean(article[heading]) && <h2 className="mb-3 text-xl font-semibold">{String(article[heading])}</h2>}
          <div className="space-y-4">{bodies.map((field) => <Html key={field} value={article[field]} />)}</div>
        </section>;
      })}
      <section className="mb-10 border-t border-zinc-200 pt-8">
        <h2 className="mb-3 text-xl font-semibold">FAQs</h2>
        {[1, 2, 3, 4].map((number) => <div key={number} className="mb-4 rounded border border-zinc-200 p-4">
          <h3 className="font-medium">{String(article[`faq_${number}_question`] ?? "")}</h3>
          <div className="mt-2"><Html value={article[`faq_${number}_answer`]} /></div>
        </div>)}
      </section>
      <section className="rounded-lg bg-zinc-950 p-6 text-white">
        <h2 className="text-xl font-semibold">{String(article.cta_heading ?? "")}</h2>
        <div className="mt-3 text-zinc-300"><Html value={article.cta_body} /></div>
        <a href={String(article.cta_button_url)} className="mt-4 inline-block rounded bg-white px-4 py-2 text-sm font-medium text-zinc-950">{String(article.cta_button_text)}</a>
      </section>
    </article>
  );
}

export function ArticlePreview({ article }: { article: Record<string, unknown> }) {
  if (article.templateType === "service_detail" || article.template_type === "service_detail") {
    return <ServiceDetailPreview article={article} />;
  }
  const featuredImagePath =
    typeof article.featuredImagePath === "string" ? article.featuredImagePath : "";

  return (
    <article className="mx-auto max-w-3xl bg-white">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase text-zinc-500">
          {String(article.heroEyebrow ?? "")}
        </p>
        <h1 className="text-3xl font-semibold leading-tight">
          {String(article.postTitle ?? "")}
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          {String(article.heroSubheading ?? "")}
        </p>
      </header>

      {featuredImagePath && (
        <div className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          <Image
            src={featuredImagePath}
            alt={String(article.featuredImageFilename ?? article.postTitle ?? "")}
            width={960}
            height={540}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      )}

      <section className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <p>
          <span className="font-medium">Keyword:</span>{" "}
          {String(article.primaryKeyword ?? "")}
        </p>
        <p>
          <span className="font-medium">Meta Title:</span>{" "}
          {String(article.metaTitle ?? "")}
        </p>
        <p
          className={
            String(article.metaDescription ?? "").length > 160 ? "text-red-700" : ""
          }
        >
          <span className="font-medium">Meta Description</span> (
          {String(article.metaDescription ?? "").length} chars):{" "}
          {String(article.metaDescription ?? "")}
        </p>
      </section>

      <p className="mb-8 text-lg leading-8 text-zinc-700">
        {String(article.introSummary ?? "")}
      </p>

      {[1, 2, 3].map((number) => (
        <section key={number} className="mb-10 border-t border-zinc-200 pt-8">
          <h2 className="mb-3 text-xl font-semibold">
            {String(article[`section${number}Heading`] ?? "")}
          </h2>
          <div
            className="article-body text-zinc-700"
            dangerouslySetInnerHTML={{
              __html: String(article[`section${number}Body`] ?? ""),
            }}
          />
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">FAQs</h2>
        {[1, 2, 3].map((number) => (
          <div key={number} className="mb-4 rounded border border-zinc-200 p-4">
            <h3 className="font-medium">
              {String(article[`faq${number}Question`] ?? "")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {String(article[`faq${number}Answer`] ?? "")}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg bg-zinc-950 p-6 text-white">
        <h2 className="text-xl font-semibold">{String(article.ctaHeading ?? "")}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {String(article.ctaBody ?? "")}
        </p>
        <p className="mt-4 text-sm font-medium">{String(article.ctaButtonText ?? "")}</p>
      </section>
    </article>
  );
}
