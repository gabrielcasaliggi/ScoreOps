"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkflowItem {
  id: string;
  tipo: "TAREA_COMPLETADA" | "KPI_AJUSTE";
  estado: string;
  comentarioSolicitud: string | null;
  comentarioResolucion: string | null;
  valorAnterior: number | null;
  valorPropuesto: number | null;
  createdAt: string;
  solicitante: { nombre: string; apellido: string };
  tarea: { titulo: string } | null;
  kpi: { nombre: string } | null;
}

interface WorkflowsPanelProps {
  canResolve?: boolean;
  showHistory?: boolean;
}

const TIPO_LABEL = {
  TAREA_COMPLETADA: "Completar tarea",
  KPI_AJUSTE: "Ajuste KPI",
};

export function WorkflowsPanel({ canResolve = false, showHistory = false }: WorkflowsPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"PENDIENTE" | "todas">("PENDIENTE");

  const load = useCallback(async () => {
    const estado = showHistory && filtro === "todas" ? "todas" : "PENDIENTE";
    const res = await fetch(`/api/workflows?estado=${estado}`);
    if (res.ok) {
      const data = await res.json();
      setWorkflows(data.workflows ?? []);
      setPendientes(data.pendientes ?? 0);
    }
    setLoading(false);
  }, [filtro, showHistory]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolver(id: string, accion: "aprobar" | "rechazar") {
    setResolvingId(id);
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    });
    setResolvingId(null);
    if (res.ok) load();
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {canResolve ? "Aprobaciones pendientes" : "Mis solicitudes"}
            </CardTitle>
            <CardDescription>
              {canResolve
                ? `${pendientes} solicitud(es) esperando tu decisión`
                : "Seguimiento de tareas y ajustes de KPI enviados"}
            </CardDescription>
          </div>
          {showHistory && (
            <select
              className="h-9 rounded-lg border px-3 text-sm"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as "PENDIENTE" | "todas")}
            >
              <option value="PENDIENTE">Pendientes</option>
              <option value="todas">Todas</option>
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {workflows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            {canResolve ? "No hay solicitudes pendientes." : "No tenés solicitudes activas."}
          </p>
        ) : (
          workflows.map((w) => (
            <div
              key={w.id}
              className={cn(
                "rounded-xl border p-4 space-y-2",
                w.estado === "PENDIENTE" && "border-amber-200 bg-amber-50/30"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {TIPO_LABEL[w.tipo]}
                    </Badge>
                    <Badge
                      variant={w.estado === "PENDIENTE" ? "warning" : "secondary"}
                      className="text-[10px]"
                    >
                      {w.estado}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">
                    {w.tipo === "TAREA_COMPLETADA"
                      ? w.tarea?.titulo ?? "Tarea"
                      : w.kpi?.nombre ?? "KPI"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.solicitante.nombre} {w.solicitante.apellido} ·{" "}
                    {new Date(w.createdAt).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>

              {w.tipo === "KPI_AJUSTE" && w.valorPropuesto != null && (
                <p className="text-sm">
                  Valor: <strong>{w.valorAnterior ?? 0}</strong> →{" "}
                  <strong>{w.valorPropuesto}</strong>
                </p>
              )}

              {w.comentarioSolicitud && (
                <p className="text-xs text-muted-foreground italic">{w.comentarioSolicitud}</p>
              )}

              {canResolve && w.estado === "PENDIENTE" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="rounded-lg h-8"
                    disabled={resolvingId === w.id}
                    onClick={() => resolver(w.id, "aprobar")}
                  >
                    {resolvingId === w.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Aprobar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg h-8"
                    disabled={resolvingId === w.id}
                    onClick={() => resolver(w.id, "rechazar")}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
