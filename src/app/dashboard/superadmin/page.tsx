import { redirect } from "next/navigation";
import { SuperAdminPanel } from "@/components/dashboard/super-admin-panel";
import { getSessionUser } from "@/lib/auth";
import { sessionIsVertiaSuperAdmin } from "@/lib/super-admin";

export default async function SuperAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!sessionIsVertiaSuperAdmin(user)) redirect("/dashboard");

  return <SuperAdminPanel />;
}
