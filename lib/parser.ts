import { parse } from "csv-parse/sync";
import {
  SERVICE_DETAIL_FIELDS,
  type ServiceDetailField,
  type ServiceDetailPayload,
} from "@/lib/templates";

export const CSV_HEADERS = [
  "postTitle", "postName", "postStatus", "postType", "templateType",
  "primaryKeyword", "serviceName", "locationName", "heroEyebrow", "heroHeading",
  "heroSubheading", "introSummary", "section1Heading", "section1Body",
  "section2Heading", "section2Body", "section3Heading", "section3Body",
  "faq1Question", "faq1Answer", "faq2Question", "faq2Answer", "faq3Question",
  "faq3Answer", "ctaHeading", "ctaBody", "ctaButtonText", "ctaButtonUrl",
  "relatedHubUrl", "relatedHubAnchor", "metaTitle", "metaDescription",
] as const;

export type ParsedArticle = Record<(typeof CSV_HEADERS)[number], string>;
export type ParsedImportRow = {
  rowNumber: number;
  templateType: "spoke" | "service_detail";
  data: ParsedArticle | ServiceDetailPayload;
  headers: string[];
};

function snakeCase(key: string) {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

function normalizedHeaderKey(value: string) {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const aliases: Record<string, string> = {
  whysangiulianoheading: "trust_heading",
  whysangiulianobody: "trust_body",
};
const spokeHeaderMap = new Map<string, (typeof CSV_HEADERS)[number]>();
const serviceHeaderMap = new Map<string, ServiceDetailField>();

for (const header of CSV_HEADERS) {
  spokeHeaderMap.set(normalizedHeaderKey(header), header);
  spokeHeaderMap.set(normalizedHeaderKey(snakeCase(header)), header);
}
for (const header of SERVICE_DETAIL_FIELDS) {
  serviceHeaderMap.set(normalizedHeaderKey(header), header);
}

function templateTypeFromRecord(record: Record<string, unknown>) {
  const pair = Object.entries(record).find(([key]) => normalizedHeaderKey(key) === "templatetype");
  return String(pair?.[1] ?? "spoke").trim().toLowerCase() === "service_detail"
    ? "service_detail" as const
    : "spoke" as const;
}

function normalizeSpoke(record: Record<string, unknown>) {
  const normalized = Object.fromEntries(Object.entries(record).map(([key, value]) => [
    spokeHeaderMap.get(normalizedHeaderKey(key)) ?? key, value,
  ]));
  return Object.fromEntries(CSV_HEADERS.map((header) => [
    header, String(normalized[header] ?? "").trim(),
  ])) as ParsedArticle;
}

function normalizeServiceDetail(record: Record<string, unknown>) {
  const normalized = Object.fromEntries(Object.entries(record).map(([key, value]) => {
    const normalizedKey = normalizedHeaderKey(key);
    return [aliases[normalizedKey] ?? serviceHeaderMap.get(normalizedKey) ?? key, value];
  }));
  const result = Object.fromEntries(SERVICE_DETAIL_FIELDS.map((field) => [
    field, String(normalized[field] ?? "").trim(),
  ])) as ServiceDetailPayload;
  result.post_status ||= "draft";
  result.post_type ||= "service";
  result.template_type = "service_detail";
  result.content_format = result.html_content ? "html" : "structured";
  return result;
}

export function parseCSVImport(csvString: string, forcedTemplate?: "spoke" | "service_detail"): ParsedImportRow[] {
  const firstRow = parse(csvString, { to_line: 1, relax_quotes: true, trim: true })[0] as string[];
  const hasHeaders = firstRow.some((cell) =>
    spokeHeaderMap.has(normalizedHeaderKey(cell)) || serviceHeaderMap.has(normalizedHeaderKey(cell)),
  );
  const records = parse(csvString, {
    columns: hasHeaders
      ? (headers: string[]) => headers.map((header) => header.trim().replace(/^\uFEFF/, ""))
      : [...CSV_HEADERS],
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];
  return records.map((record, index) => {
    const templateType = forcedTemplate ?? templateTypeFromRecord(record);
    return {
      rowNumber: index + 2,
      templateType,
      data: templateType === "service_detail" ? normalizeServiceDetail(record) : normalizeSpoke(record),
      headers: hasHeaders ? firstRow.map((header) => header.trim().replace(/^\uFEFF/, "")) : [...CSV_HEADERS],
    };
  });
}

export function parseCSV(csvString: string): ParsedArticle[] {
  return parseCSVImport(csvString).filter((row) => row.templateType === "spoke")
    .map((row) => row.data as ParsedArticle);
}
