import { parse } from "csv-parse/sync";

export const CSV_HEADERS = [
  "postTitle",
  "postName",
  "postStatus",
  "postType",
  "templateType",
  "primaryKeyword",
  "serviceName",
  "locationName",
  "heroEyebrow",
  "heroHeading",
  "heroSubheading",
  "introSummary",
  "section1Heading",
  "section1Body",
  "section2Heading",
  "section2Body",
  "section3Heading",
  "section3Body",
  "faq1Question",
  "faq1Answer",
  "faq2Question",
  "faq2Answer",
  "faq3Question",
  "faq3Answer",
  "ctaHeading",
  "ctaBody",
  "ctaButtonText",
  "ctaButtonUrl",
  "relatedHubUrl",
  "relatedHubAnchor",
  "metaTitle",
  "metaDescription",
] as const;

export type ParsedArticle = Record<(typeof CSV_HEADERS)[number], string>;

function snakeCase(key: string) {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

function normalizedHeaderKey(value: string) {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_TO_FIELD = new Map<string, (typeof CSV_HEADERS)[number]>();

CSV_HEADERS.forEach((header) => {
  HEADER_TO_FIELD.set(normalizedHeaderKey(header), header);
  HEADER_TO_FIELD.set(normalizedHeaderKey(snakeCase(header)), header);
});

function normalizeHeaderCell(cell: string) {
  return HEADER_TO_FIELD.get(normalizedHeaderKey(cell)) ?? normalizeHeaderCellRaw(cell);
}

function normalizeHeaderCellRaw(cell: string) {
  return cell.trim().replace(/^\uFEFF/, "");
}

function normalizeRecord(record: Record<string, unknown>) {
  const article: Record<string, string> = {};
  const normalizedRecord = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      HEADER_TO_FIELD.get(normalizedHeaderKey(key)) ?? key,
      value,
    ]),
  );

  CSV_HEADERS.forEach((header) => {
    const value = normalizedRecord[header] ?? "";
    article[header] = String(value ?? "").trim();
  });

  return article as ParsedArticle;
}

export function parseCSV(csvString: string): ParsedArticle[] {
  const firstRow = parse(csvString, {
    from_line: 1,
    to_line: 1,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  })[0] as string[] | undefined;

  const hasHeaders = firstRow?.some((cell) =>
    HEADER_TO_FIELD.has(normalizedHeaderKey(cell)),
  );

  const records = parse(csvString, {
    columns: hasHeaders
      ? (headers: string[]) => headers.map(normalizeHeaderCell)
      : [...CSV_HEADERS],
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return records.map(normalizeRecord);
}
