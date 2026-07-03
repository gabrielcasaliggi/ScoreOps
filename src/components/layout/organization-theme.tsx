import type { CSSProperties } from "react";
import type { OrganizationBranding } from "@/lib/organization-brand";
import { brandingToCssVars } from "@/lib/organization-brand";

interface OrganizationThemeProps {
  branding: OrganizationBranding;
  children: React.ReactNode;
}

export function OrganizationTheme({ branding, children }: OrganizationThemeProps) {
  const style = brandingToCssVars(branding.primaryColor) as CSSProperties | undefined;

  return (
    <div style={style} data-org={branding.slug} className="min-h-full">
      {children}
    </div>
  );
}
