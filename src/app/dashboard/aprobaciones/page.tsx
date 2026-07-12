"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowsPanel } from "@/components/dashboard/workflows-panel";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardCheck className="h-6 w-6" />
            {isManager ? "Aprobaciones" : "Mis solicitudes"}
          </h1>
        }
        description={
          isManager
            ? "Revisá lo que tu equipo envió: tareas completadas y ajustes de KPI. Una decisión cierra la solicitud."
            : "Seguí el estado de lo que enviaste a revisión."
        }
        actions={
          isManager ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard/tareas">
                <ListTodo className="h-4 w-4 mr-2" />
                Ir a Tareas
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isManager && (
        <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Cómo funciona:</strong> el empleado
            pide revisión → vos aprobás o devolvés → él recibe aviso.
          </p>
          <p>
            Atajo: en el tablero de <strong className="text-foreground">Tareas</strong>,
            columna <em>Por aprobar</em>, también podés decidir con botones o
            arrastrando a Completada / En proceso.
          </p>
        </div>
      )}

      <WorkflowsPanel canResolve={isManager} showHistory />
    </div>
  );
}
