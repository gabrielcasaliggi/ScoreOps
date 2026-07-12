"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ClipboardList,
  Clock,
  Loader2,
  Target,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  resolvedAt?: string | null;
  solicitante: { nombre: string; apellido: string };
  resolutor?: { nombre: string; apellido: string } | null;
  tarea: { id: string; titulo: string } | null;
  kpi: { id: string; nombre: string } | null;
}

interface WorkflowsPanelProps {
  canResolve?: boolean;
  showHistory?: boolean;
}

const TIPO_LABEL = {
  TAREA_COMPLETADA: "Completar tarea",
  KPI_AJUSTE: "Ajuste KPI",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

function estadoBadgeVariant(
  estado: string
): "warning" | "success" | "destructive" | "secondary" {
  if (estado === "PENDIENTE") return "warning";
  if (estado === "APROBADA") return "success";
  if (estado === "RECHAZADA") return "destructive";
  return "secondary";
}

export function WorkflowsPanel({ canResolve = false, showHistory = false }: WorkflowsPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"PENDIENTE" | "todas">("PENDIENTE");
  const [tipoFiltro, setTipoFiltro] = useState<"todas" | "TAREA_COMPLETADA" | "KPI_AJUSTE">(
    "todas"
  );
  const [rejectTarget, setRejectTarget] = useState<WorkflowItem | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionError, setActionError] = useState("");

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

  const visible = workflows.filter(
    (w) => tipoFiltro === "todas" || w.tipo === tipoFiltro
  );

  async function resolver(
    id: string,
    accion: "aprobar" | "rechazar",
    comentario?: string
  ) {
    setActionError("");
    setResolvingId(id);
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, comentario: comentario || undefined }),
    });
    setResolvingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "No se pudo resolver la solicitud");
      return;
    }
    setRejectTarget(null);
    setRejectComment("");
    load();
  }

  async function cancelar(id: string) {
    setActionError("");
    setResolvingId(id);
    const res = await fetch(`/api/workflows?id=${id}`, { method: "DELETE" });
    setResolvingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "No se pudo cancelar");
      return;
    }
    load();
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
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {canResolve ? "Cola de decisiones" : "Mis solicitudes"}
              </CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                {canResolve
                  ? "Aprobá o rechazá lo que el equipo envió a revisión. También podés hacerlo arrastrando tarjetas en Tareas."
                  : "Pedidos de completar tareas o actualizar KPIs. Podés cancelar mientras estén pendientes."}
              </CardDescription>
            </div>
            {canResolve && pendientes > 0 && (
              <Badge variant="warning" className="text-sm px-3 py-1">
                {pendientes} por revisar
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {showHistory && (
              <select
                className="h-9 rounded-lg border px-3 text-sm bg-background"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as "PENDIENTE" | "todas")}
              >
                <option value="PENDIENTE">Solo pendientes</option>
                <option value="todas">Historial</option>
              </select>
            )}
            <select
              className="h-9 rounded-lg border px-3 text-sm bg-background"
              value={tipoFiltro}
              onChange={(e) =>
                setTipoFiltro(e.target.value as typeof tipoFiltro)
              }
            >
              <option value="todas">Todos los tipos</option>
              <option value="TAREA_COMPLETADA">Tareas</option>
              <option value="KPI_AJUSTE">KPIs</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {actionError && (
            <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {actionError}
            </p>
          )}

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center space-y-2">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">
                {canResolve && filtro === "PENDIENTE"
                  ? "Nada pendiente de tu decisión"
                  : "Sin solicitudes en este filtro"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {canResolve
                  ? "Cuando un empleado envíe una tarea a revisión o un ajuste de KPI, aparece acá."
                  : "Cuando envíes algo a revisión, lo vas a ver acá."}
              </p>
            </div>
          ) : (
            visible.map((w) => {
              const isTask = w.tipo === "TAREA_COMPLETADA";
              return (
                <div
                  key={w.id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3",
                    w.estado === "PENDIENTE" && "border-amber-200 bg-amber-50/40"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          {isTask ? (
                            <ClipboardList className="h-3 w-3" />
                          ) : (
                            <Target className="h-3 w-3" />
                          )}
                          {TIPO_LABEL[w.tipo]}
                        </Badge>
                        <Badge
                          variant={estadoBadgeVariant(w.estado)}
                          className="text-[10px]"
                        >
                          {ESTADO_LABEL[w.estado] ?? w.estado}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm leading-snug">
                        {isTask
                          ? w.tarea?.titulo ?? "Tarea"
                          : w.kpi?.nombre ?? "KPI"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {canResolve
                          ? `${w.solicitante.nombre} ${w.solicitante.apellido}`
                          : "Vos"}{" "}
                        · {new Date(w.createdAt).toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  {w.tipo === "KPI_AJUSTE" && w.valorPropuesto != null && (
                    <p className="text-sm rounded-lg bg-muted/50 px-3 py-2">
                      Valor propuesto:{" "}
                      <strong className="tabular-nums">{w.valorAnterior ?? 0}</strong>
                      {" → "}
                      <strong className="tabular-nums text-primary">
                        {w.valorPropuesto}
                      </strong>
                    </p>
                  )}

                  {w.comentarioSolicitud && (
                    <p className="text-xs text-muted-foreground italic border-l-2 pl-3">
                      “{w.comentarioSolicitud}”
                    </p>
                  )}

                  {w.estado !== "PENDIENTE" && w.comentarioResolucion && (
                    <p className="text-xs text-muted-foreground">
                      Resolución: {w.comentarioResolucion}
                      {w.resolutor &&
                        ` · ${w.resolutor.nombre} ${w.resolutor.apellido}`}
                    </p>
                  )}

                  {canResolve && w.estado === "PENDIENTE" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="rounded-lg h-9"
                        disabled={resolvingId === w.id}
                        onClick={() => resolver(w.id, "aprobar")}
                      >
                        {resolvingId === w.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Aprobar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-9"
                        disabled={resolvingId === w.id}
                        onClick={() => {
                          setRejectComment("");
                          setRejectTarget(w);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Devolver
                      </Button>
                    </div>
                  )}

                  {!canResolve && w.estado === "PENDIENTE" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg h-8 text-muted-foreground"
                      disabled={resolvingId === w.id}
                      onClick={() => cancelar(w.id)}
                    >
                      Cancelar solicitud
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver solicitud</DialogTitle>
            <DialogDescription>
              {rejectTarget?.tipo === "TAREA_COMPLETADA"
                ? "La tarea vuelve a En proceso. El empleado puede corregirla y reenviarla."
                : "El KPI no cambia. El empleado puede pedir otro valor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-comment">Motivo (opcional)</Label>
            <Input
              id="reject-comment"
              className="rounded-xl"
              placeholder="Ej: Falta evidencia / valor incorrecto"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectTarget || resolvingId === rejectTarget.id}
              onClick={() =>
                rejectTarget &&
                resolver(rejectTarget.id, "rechazar", rejectComment.trim())
              }
            >
              {resolvingId === rejectTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar devolución"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
