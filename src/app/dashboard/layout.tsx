import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return <AppShell user={user}>{children}</AppShell>;
}
