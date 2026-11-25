const ALLOWED_TAGS = new Set([
  "p", "a", "strong", "b", "em", "ul", "ol", "li", "table", "thead",
  "tbody", "tr", "th", "td", "br", "h1", "h2", "h3", "pre", "code", "blockquote",
]);
const VOID_TAGS = new Set(["br"]);
const SAFE_STYLE_PROPERTIES = new Set([
  "border", "border-collapse", "border-spacing", "width", "max-width",
  "padding", "text-align", "vertical-align", "background-color", "color",
]);

function escapeText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function safeUrl(value: string) {
  try {
    const url = new URL(value, "https://outpost.invalid");
    return url.protocol === "https:" || (url.origin === "https://outpost.invalid" && value.startsWith("/"));
  } catch {
    return false;
  }
}

function sanitizeStyle(value: string) {
  return value.split(";").map((declaration) => declaration.trim()).filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 1) return "";
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const styleValue = declaration.slice(separator + 1).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property) || /url\s*\(|expression\s*\(|javascript:|data:/i.test(styleValue)) return "";
      return `${property}: ${styleValue}`;
    }).filter(Boolean).join("; ");
}

export function sanitizeHtml(input: string) {
  const withoutDangerousBlocks = input.replace(/<(script|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<(script|iframe|object|embed|form)\b[^>]*\/?>/gi, "");
  return withoutDangerousBlocks.replace(/<([^>]+)>/g, (full, raw: string) => {
    const closing = raw.match(/^\s*\/\s*([a-z0-9]+)/i);
    if (closing) return ALLOWED_TAGS.has(closing[1].toLowerCase()) ? `</${closing[1].toLowerCase()}>` : "";
    const opening = raw.match(/^\s*([a-z0-9]+)/i);
    if (!opening) return escapeText(full);
    const tag = opening[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const attrs: string[] = [];
    for (const match of raw.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (name.startsWith("on")) continue;
      if (tag === "a" && name === "href" && safeUrl(value)) attrs.push(`href="${value.replaceAll('"', "&quot;")}"`);
      if (tag === "a" && name === "target" && ["_blank", "_self"].includes(value)) attrs.push(`target="${value}"`);
      if (tag === "a" && name === "rel") attrs.push(`rel="${value.replace(/[^a-z\s-]/gi, "")}"`);
      if (["table", "th", "td"].includes(tag) && name === "style") {
        const style = sanitizeStyle(value);
        if (style) attrs.push(`style="${style}"`);
      }
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}${VOID_TAGS.has(tag) ? " /" : ""}>`;
  });
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

export function containsUnsafeHtml(value: string) {
  return /<(script|iframe|object|embed|form)\b|\son\w+\s*=|(?:javascript|data)\s*:/i.test(value);
}
