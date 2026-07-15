import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BrandIsotype } from "@/components/brand/brand-isotype";
import { getSessionUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 app-mesh-bg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-24 top-16 h-72 w-72 rounded-full bg-teal-600/12 blur-3xl" />
        <div className="animate-blob-delayed absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-slate-700/10 blur-3xl" />
      </div>
      <div className="relative mb-8 animate-page-enter text-center">
        <BrandIsotype size="lg" elevated className="mx-auto mb-5 animate-float-icon" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {BRAND.name}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {BRAND.tagline}
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
