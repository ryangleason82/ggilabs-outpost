import Image from "next/image";

export function ArticlePreview({ article }: { article: Record<string, unknown> }) {
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
