export interface AutoCheckResult {
  autoNoEmDashes: boolean;
  autoExternalLinksPresent: boolean;
  autoTablePresent: boolean;
  autoMetaLength: boolean;
  autoKeywordInTitle: boolean;
  autoNoMarkdownLinks: boolean;
}

export const AUTO_CHECK_KEYS = [
  "autoNoEmDashes",
  "autoExternalLinksPresent",
  "autoTablePresent",
  "autoMetaLength",
  "autoKeywordInTitle",
  "autoNoMarkdownLinks",
] as const;

export function runAutoChecks(article: Record<string, string>): AutoCheckResult {
  const allText = Object.values(article).join(" ");
  const bodyFields = [
    article.section1Body,
    article.section2Body,
    article.section3Body,
  ].join(" ");

  return {
    autoNoEmDashes: !allText.includes("—") && !allText.includes("–"),
    autoExternalLinksPresent:
      bodyFields.includes('rel=""nofollow""') ||
      bodyFields.includes("rel='nofollow'") ||
      bodyFields.includes('rel="nofollow"'),
    autoTablePresent: bodyFields.includes("border-collapse"),
    autoMetaLength:
      (article.metaTitle ?? "").length <= 60 &&
      (article.metaDescription ?? "").length <= 160,
    autoKeywordInTitle: (article.postTitle ?? "")
      .toLowerCase()
      .includes((article.primaryKeyword ?? "").toLowerCase()),
    autoNoMarkdownLinks: !/\[[^\]]+\]\(https?:\/\//i.test(bodyFields),
  };
}

export function autoChecksPassed(checks: AutoCheckResult): boolean {
  return Object.values(checks).every(Boolean);
}

export function autoCheckLabel(key: string): string {
  const labels: Record<string, string> = {
    autoNoEmDashes: "No em dashes or en dashes",
    autoExternalLinksPresent: "External links with nofollow present",
    autoTablePresent: "Inline-styled table present",
    autoMetaLength: "Meta title under 60 chars, description under 160",
    autoKeywordInTitle: "Primary keyword in post title",
    autoNoMarkdownLinks: "No markdown link artifacts",
  };

  return labels[key] ?? key;
}
