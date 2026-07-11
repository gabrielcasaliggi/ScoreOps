import type { CSSProperties } from "react";
import { BRAND } from "./brand";

export interface OrganizationBranding {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string | null;
  premioHabilitado: boolean;
}

export function resolveBranding(org: {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  premioHabilitado?: boolean;
}): OrganizationBranding {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    tagline: org.tagline ?? BRAND.tagline,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    premioHabilitado: org.premioHabilitado ?? true,
  };
}

export function brandingToCssVars(primaryColor: string | null): CSSProperties | undefined {
  if (!primaryColor) return undefined;
  return {
    ["--primary" as string]: primaryColor,
    ["--ring" as string]: primaryColor,
  };
}
