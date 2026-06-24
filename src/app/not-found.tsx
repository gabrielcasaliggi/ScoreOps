import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIsotype } from "@/components/brand/brand-isotype";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 app-mesh-bg">
      <BrandIsotype size="md" elevated />
      <div className="max-w-md text-center">
        <div className="mb-3 flex justify-center">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta que buscás no existe en {BRAND.name}.
        </p>
      </div>
      <Link href="/dashboard">
        <Button className="rounded-xl">Volver al inicio</Button>
      </Link>
    </div>
  );
}
