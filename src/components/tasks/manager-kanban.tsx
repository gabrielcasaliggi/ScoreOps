"use client";

import { useCallback, useState } from "react";
import {
  Circle,
  CircleDot,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatMinutes } from "@/lib/utils";

type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";

interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string | null;
  estado: TaskStatus;
  tiempoEstimado: number;
  tiempoReal: number | null;
  prioridad: number;
  startedAt: string | null;
  fechaLimite?: string | null;
  evaluaProductividad: boolean;
  pesoProductividad: number;
  user: { id: string; nombre: string; apellido: string };
  objetivo?: { id: string; titulo: string } | null;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
}

interface ObjetivoOption {
  id: string;
  titulo: string;
  userId: string;
}

interface ManagerKanbanProps {
  tareas: Tarea[];
  usuarios: Usuario[];
  objetivos?: ObjetivoOption[];
  areaNombre?: string;
  onRefresh: () => void;
}

const COLUMNS: {
  key: TaskStatus;
  label: string;
  accent: string;
  icon: typeof Circle;
  hint: string;
}[] = [
  {
    key: "PENDIENTE",
    label: "Pendiente",
    accent: "border-t-slate-400",
    icon: Circle,
    hint: "Por iniciar",
  },
  {
    key: "EN_PROCESO",
    label: "En proceso",
    accent: "border-t-blue-500",
    icon: CircleDot,
    hint: "En ejecución",
  },
  {
    key: "COMPLETADA",
    label: "Completada",
    accent: "border-t-emerald-500",
    icon: Sparkles,
    hint: "Cuenta al premio",
  },
];

const PRIORITY_LABEL: Record<number, string> = {
  1: "Alta",
  2: "Media",
  3: "Baja",
};

const emptyForm = {
  titulo: "",
  tiempoEstimado: "60",
  userId: "",
  objetivoId: "",
  evaluaProductividad: true,
  pesoProductividad: "2",
};

export function ManagerKanban({
  tareas,
  usuarios,
  objetivos = [],
  areaNombre,
  onRefresh,
}: ManagerKanbanProps) {
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = filtroEmpleado
    ? tareas.filter((t) => t.user.id === filtroEmpleado)
    : tareas;

  const objetivosDelEmpleado = form.userId
    ? objetivos.filter((o) => o.userId === form.userId)
    : [];

  async function updateEstado(id: string, estado: TaskStatus) {
    setLoadingId(id);
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setLoadingId(null);
    onRefresh();
  }

  async function handleDrop(targetEstado: TaskStatus, tareaId: string) {
    const tarea = tareas.find((t) => t.id === tareaId);
    if (!tarea || tarea.estado === targetEstado) return;
    await updateEstado(tareaId, targetEstado);
    setDropTarget(null);
  }

  async function createTarea() {
    await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        tiempoEstimado: Number(form.tiempoEstimado),
        userId: form.userId,
        objetivoId: form.objetivoId || undefined,
        evaluaProductividad: form.evaluaProductividad,
        pesoProductividad: Number(form.pesoProductividad),
      }),
    });
    setShowCreate(false);
    setForm(emptyForm);
    onRefresh();
  }

  const onDragStart = useCallback((id: string) => setDraggingId(id), []);
  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="space-y-5">
      <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          {areaNombre && (
            <p className="text-sm">
              <span className="text-muted-foreground">Supervisando </span>
              <span className="font-semibold text-primary">{areaNombre}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Arrastrá tarjetas entre columnas. Las marcadas con{" "}
            <span className="font-medium text-violet-600">Premio</span> alimentan el pago semestral.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              className="h-10 min-w-[180px] appearance-none rounded-xl border border-input bg-white pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={filtroEmpleado}
              onChange={(e) => setFiltroEmpleado(e.target.value)}
            >
              <option value="">Todos los empleados</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setShowCreate(true)} className="shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Asignar tarea
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnTasks = filtered.filter((t) => t.estado === col.key);
          const ColIcon = col.icon;
          const isDropTarget = dropTarget === col.key;

          return (
            <div
              key={col.key}
              className={cn(
                "kanban-column border-t-4 p-3",
                col.accent,
                isDropTarget && "kanban-column--drag-over"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget(col.key);
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/tarea-id");
                if (id) void handleDrop(col.key, id);
              }}
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <ColIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-sm">{col.label}</h3>
                    <p className="text-[10px] text-muted-foreground">{col.hint}</p>
                  </div>
                </div>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-xs font-bold shadow-sm">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-2.5 min-h-[200px]">
                {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 py-10 text-center">
                    <p className="text-xs text-muted-foreground">Sin tareas</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Arrastrá aquí
                    </p>
                  </div>
                )}
                {columnTasks.map((tarea) => (
                  <div
                    key={tarea.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/tarea-id", tarea.id);
                      onDragStart(tarea.id);
                    }}
                    onDragEnd={onDragEnd}
                    className={cn(
                      "kanban-card p-3",
                      draggingId === tarea.id && "kanban-card--dragging",
                      loadingId === tarea.id && "pointer-events-none opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-semibold text-sm leading-snug">{tarea.titulo}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                            {tarea.user.nombre.charAt(0)}
                            {tarea.user.apellido.charAt(0)}
                          </div>
                          {tarea.user.nombre} {tarea.user.apellido}
                        </div>
                        {tarea.objetivo && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            🎯 {tarea.objetivo.titulo}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant={
                              tarea.prioridad === 1
                                ? "destructive"
                                : tarea.prioridad === 2
                                  ? "warning"
                                  : "secondary"
                            }
                            className="text-[10px] px-2"
                          >
                            {PRIORITY_LABEL[tarea.prioridad]}
                          </Badge>
                          {tarea.evaluaProductividad && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 border-violet-300 bg-violet-50 text-violet-700"
                            >
                              Premio ×{tarea.pesoProductividad}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          ⏱ {formatMinutes(tarea.tiempoEstimado)}
                          {tarea.tiempoReal != null &&
                            ` → ${formatMinutes(tarea.tiempoReal)}`}
                        </p>
                      </div>
                      {loadingId === tarea.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar tarea al equipo</DialogTitle>
            <DialogDescription>
              Las tareas evaluables completadas en el semestre suman al premio (60% KPI + 40%
              eficiencia).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                className="rounded-xl"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Revisar informe mensual"
              />
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.userId}
                onChange={(e) =>
                  setForm({ ...form, userId: e.target.value, objetivoId: "" })
                }
              >
                <option value="">Seleccionar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>
            {objetivosDelEmpleado.length > 0 && (
              <div className="space-y-2">
                <Label>Objetivo (opcional)</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={form.objetivoId}
                  onChange={(e) => setForm({ ...form, objetivoId: e.target.value })}
                >
                  <option value="">Sin objetivo</option>
                  {objetivosDelEmpleado.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.titulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tiempo estimado (minutos)</Label>
              <Input
                type="number"
                className="rounded-xl"
                value={form.tiempoEstimado}
                onChange={(e) => setForm({ ...form, tiempoEstimado: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.evaluaProductividad}
                onChange={(e) =>
                  setForm({ ...form, evaluaProductividad: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm">
                <span className="font-medium text-violet-800">Cuenta para premio</span>
                <span className="block text-xs text-muted-foreground">
                  Impacta el pago semestral de productividad
                </span>
              </span>
            </label>
            {form.evaluaProductividad && (
              <div className="space-y-2">
                <Label>Peso en evaluación</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={form.pesoProductividad}
                  onChange={(e) =>
                    setForm({ ...form, pesoProductividad: e.target.value })
                  }
                >
                  <option value="1">1 — Bajo</option>
                  <option value="2">2 — Medio</option>
                  <option value="3">3 — Alto</option>
                </select>
              </div>
            )}
            <Button
              onClick={createTarea}
              className="w-full rounded-xl"
              disabled={!form.titulo || !form.userId}
            >
              Crear y asignar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
