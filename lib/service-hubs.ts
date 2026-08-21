export const SERVICE_HUBS = {
  roofing: { label: "Roofing", path: "/roofing/" },
  siding: { label: "Siding", path: "/siding/" },
  gutters: { label: "Gutters", path: "/gutters/" },
  commercial: { label: "Commercial", path: "/commercial/" },
} as const;

export type ServiceHubSlug = string;

export const SERVICE_HUB_OPTIONS = Object.entries(SERVICE_HUBS).map(([slug, hub]) => ({
  slug,
  label: hub.label,
  path: hub.path,
}));

export function isServiceHubSlug(value: string): value is ServiceHubSlug {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function serviceHub(value: string) {
  if (!isServiceHubSlug(value)) return null;
  const configured = SERVICE_HUBS[value as keyof typeof SERVICE_HUBS];
  return configured ?? {
    label: value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    path: `/${value}/`,
  };
}

export function expectedServicePath(hub: string, slug: string) {
  const configured = serviceHub(hub);
  if (!configured || !slug) return "";
  return `${configured.path}${slug.replace(/^\/+|\/+$/g, "")}/`;
}
