"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIsotype } from "@/components/brand/brand-isotype";
import { BRAND } from "@/lib/brand";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 app-mesh-bg">
      <BrandIsotype size="md" elevated />
      <div className="max-w-md text-center">
        <div className="mb-3 flex justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado en {BRAND.name}. Podés reintentar o volver al inicio.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button className="rounded-xl" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-xl bg-white/80">
            Ir al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
