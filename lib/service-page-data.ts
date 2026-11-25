import { prisma } from "@/lib/prisma";
import { parseJson, type ServicePageInputs, type ServicePageSeo, type ServicePageValidation } from "@/lib/service-pages";

export async function servicePageForClient(id: string, clientId: string | null) {
  if (!clientId) return null;
  return prisma.servicePage.findFirst({ where: { id, clientId }, include: { revisions: { orderBy: { revisionNumber: "desc" } }, client: true } });
}

export function serializeServicePage<T extends { currentRevisionId: string | null; revisions: Array<{ id: string; inputsJson: string; seoJson: string; validationJson: string; sectionsJson: string }> }>(page: T) {
  const current = page.revisions.find((r) => r.id === page.currentRevisionId) ?? page.revisions[0] ?? null;
  return { ...page, currentRevision: current ? { ...current, inputs: parseJson<ServicePageInputs>(current.inputsJson, {} as ServicePageInputs), seo: parseJson<ServicePageSeo>(current.seoJson, {} as ServicePageSeo), validation: parseJson<ServicePageValidation>(current.validationJson, { status: "fail", checks: [], seoScore: 0, accessibilityScore: 0 }), sections: parseJson<string[]>(current.sectionsJson, []) } : null };
}
