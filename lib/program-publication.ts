const MAX_SLUG_BASE_LENGTH = 80;

export function approvedProgramSourceSlug(programName: string, id: string) {
  const base = programName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");
  const suffix = id.replaceAll("-", "").slice(0, 8).toLowerCase();
  return `${base || "program"}-${suffix}`;
}
