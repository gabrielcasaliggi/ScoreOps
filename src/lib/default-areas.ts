/** Áreas iniciales al dar de alta una empresa. El admin queda en Administración. */
export const DEFAULT_ORG_AREAS = [
  "Administración",
  "Operaciones",
  "Comercial",
  "Finanzas",
  "RRHH",
] as const;

export const ADMIN_DEFAULT_AREA = "Administración";

export function normalizeAreaNames(input: string[] | undefined): string[] {
  const fromInput = (input ?? [])
    .map((n) => n.trim())
    .filter(Boolean);

  const names = fromInput.length > 0 ? fromInput : [...DEFAULT_ORG_AREAS];

  if (!names.some((n) => n.toLowerCase() === ADMIN_DEFAULT_AREA.toLowerCase())) {
    names.unshift(ADMIN_DEFAULT_AREA);
  }

  // unique case-insensitive, preserve first spelling
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}
