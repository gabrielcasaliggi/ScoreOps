"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowsPanel } from "@/components/dashboard/workflows-panel";

export default function AprobacionesPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? null));
  }, []);

  const isManager = role === "ADMINISTRADOR" || role === "GERENTE";

  if (!role) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardCheck className="h-6 w-6" />
            {isManager ? "Aprobaciones" : "Mis solicitudes"}
          </h1>
        }
        description={
          isManager
            ? "Revisá tareas completadas y ajustes de KPI de tu equipo"
            : "Estado de tus solicitudes de completar tareas o actualizar KPIs"
        }
      />
      <WorkflowsPanel canResolve={isManager} showHistory={isManager} />
    </div>
  );
}
