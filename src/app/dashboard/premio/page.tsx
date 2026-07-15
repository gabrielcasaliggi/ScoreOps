"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { CoordinatorDashboard } from "@/components/dashboard/coordinator-dashboard";
import { PremioFormulaExplainer } from "@/components/dashboard/premio-formula-explainer";
import { PremioGuiaRapida } from "@/components/dashboard/premio-guia-rapida";
import { PremioSimulator } from "@/components/dashboard/premio-simulator";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function PremioPage() {
  const [role, setRole] = useState<string | null>(null);
  const [premioHabilitado, setPremioHabilitado] = useState(true);
  const [areaNombre, setAreaNombre] = useState<string>();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.user?.role ?? null);
        setAreaNombre(data.user?.areaNombre);
        setPremioHabilitado(data.user?.premioHabilitado !== false);
      });
  }, []);

  if (!role) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!premioHabilitado) {
    return (
      <p className="text-muted-foreground">
        El premio a la productividad no está habilitado en esta organización.
      </p>
    );
  }

  if (role === "EMPLEADO") {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-display text-lg font-bold tracking-tight text-slate-900">
          Tu premio está en Mi tablero
        </p>
        <p className="text-sm text-muted-foreground">
          Acá es la vista de gerentes. En Mi tablero vas a ver cuánto sumás hoy, qué tramos te
          faltan y tips para mejorar.
        </p>
        <Link href="/dashboard">
          <Button className="rounded-lg">Ir a Mi tablero</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
            <Award className="h-6 w-6 shrink-0 text-slate-800" />
            Premio semestral
          </h1>
        }
        description="Hasta 50% del sueldo de referencia. Entendé la fórmula, las metas del equipo y a quién acompañar antes del pago."
      />

      <PremioGuiaRapida />
      <PremioFormulaExplainer />

      <CoordinatorDashboard
        isAdmin={role === "ADMINISTRADOR"}
        userAreaNombre={areaNombre}
        variant="premio"
      />

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm open:pb-4">
        <summary className="cursor-pointer list-none px-5 py-4 font-display text-sm font-bold tracking-tight text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Herramienta avanzada: simular KPI y eficiencia
            <span className="text-xs font-medium text-muted-foreground group-open:hidden">
              Abrir
            </span>
            <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">
              Cerrar
            </span>
          </span>
        </summary>
        <div className="border-t px-5 pt-4">
          <PremioSimulator />
        </div>
      </details>
    </div>
  );
}
