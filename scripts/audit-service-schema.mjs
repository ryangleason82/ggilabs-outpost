const slugs = process.argv.slice(2);
const targets = slugs.length ? slugs : [
  "roof-repair-bucks-county-pa",
  "roof-replacement-bucks-county-pa",
  "storm-damage-roof-repair-bucks-county-pa",
  "emergency-roofing-bucks-county-pa",
  "roof-insurance-claim-assistance-bucks-county-pa",
];

const decode = (value = "") => value.replaceAll("&amp;", "&").replaceAll("&#038;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
const attribute = (tag = "", name) => decode(tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? "");
const meta = (html, property) => {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:itemprop|property)=["']${property}["'])[^>]*>`, "i"))?.[0] ?? "";
  return attribute(tag, "content");
};

const results = await Promise.all(targets.map(async (slug) => {
  const expected = `https://sangiulianoroofing.com/roofing/${slug}/`;
  const response = await fetch(`${expected}?outpost_schema_audit=${Date.now()}`, { headers: { "Cache-Control": "no-cache" }, redirect: "follow" });
  const html = await response.text();
  const canonicalTag = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/i)?.[0] ?? "";
  const ogTag = html.match(/<meta\b(?=[^>]*property=["']og:url["'])[^>]*>/i)?.[0] ?? "";
  const serviceTag = html.match(/<[^>]+itemtype=["']https:\/\/schema\.org\/Service["'][^>]*>/i)?.[0] ?? "";
  const serviceStart = serviceTag ? html.indexOf(serviceTag) : -1;
  const serviceHtml = serviceStart >= 0 ? html.slice(serviceStart, serviceStart + 5000) : "";
  const serviceUrlTag = serviceHtml.match(/<link\b(?=[^>]*itemprop=["']url["'])[^>]*>/i)?.[0] ?? "";
  const areaServed = [...serviceHtml.matchAll(/<meta\b(?=[^>]*itemprop=["']areaServed["'])[^>]*>/gi)].map((match) => attribute(match[0], "content"));
  const canonical = attribute(canonicalTag, "href");
  const ogUrl = attribute(ogTag, "content");
  const itemId = attribute(serviceTag, "itemid");
  const serviceUrl = attribute(serviceUrlTag, "href");
  return {
    slug, httpStatus: response.status, finalResponseUrl: response.url, expected, canonical, ogUrl, itemId, serviceUrl,
    serviceType: meta(serviceHtml, "serviceType"), description: meta(serviceHtml, "description"), areaServed,
    providerPresent: /itemprop=["']provider["'][^>]*itemtype=["']https:\/\/schema\.org\/RoofingContractor["']/i.test(serviceHtml),
    documentBlogType: /<html\b[^>]*itemtype=["']https:\/\/schema\.org\/Blog["']/i.test(html),
    consistent: canonical === expected && ogUrl === expected && itemId === `${expected}#service` && serviceUrl === expected,
  };
}));

console.log(JSON.stringify(results, null, 2));
