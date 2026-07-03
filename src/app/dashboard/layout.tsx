import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OrganizationTheme } from "@/components/layout/organization-theme";
import { getSessionUser, getOrganizationBranding } from "@/lib/auth";
import { resolveBranding } from "@/lib/organization-brand";
import { BRAND } from "@/lib/brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const branding =
    (await getOrganizationBranding(user.organizationId)) ??
    resolveBranding({
      id: user.organizationId,
      slug: "demo",
      name: BRAND.name,
      tagline: BRAND.tagline,
      logoUrl: null,
      primaryColor: null,
    });

  return (
    <OrganizationTheme branding={branding}>
      <AppShell user={user} branding={branding}>
        {children}
      </AppShell>
    </OrganizationTheme>
  );
}
