const MAX_SLUG_BASE_LENGTH = 80;

function stableSlug(value: string, id: string, fallback: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");
  const suffix = id.replaceAll("-", "").slice(0, 8).toLowerCase();
  return `${base || fallback}-${suffix}`;
}

export function approvedProgramSourceSlug(programName: string, id: string) {
  return stableSlug(programName, id, "program");
}

export function approvedProgramCampaignSlug(programName: string, id: string) {
  return stableSlug(programName, id, "campaign");
}

export function approvedOrganizationSlug(
  organizationName: string,
  ownerId: string,
) {
  return stableSlug(organizationName, ownerId, "organization");
}
