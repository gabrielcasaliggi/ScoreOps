"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TareaFechaLimiteBadge } from "@/components/tasks/tarea-fecha-limite";
import {
  badgeVariantEstadoTarea,
  getTareaLimiteStatus,
  labelEstadoTarea,
  toFechaLimiteIso,
} from "@/lib/task-utils";
import { cn, getInitials } from "@/lib/utils";

type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "PENDIENTE_APROBACION" | "COMPLETADA";

export interface CalendarTarea {
  id: string;
  titulo: string;
  estado: TaskStatus | string;
  fechaLimite?: string | null;
  prioridad: number;
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

interface ManagerTaskCalendarProps {
  tareas: CalendarTarea[];
  usuarios: Usuario[];
  objetivos?: ObjetivoOption[];
  onRefresh: () => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DND_TYPE = "application/x-vertia-tarea-id";

const emptyCreateForm = {
  titulo: "",
  tiempoEstimado: "60",
  userId: "",
  objetivoId: "",
  fechaLimite: "",
  evaluaProductividad: true,
  pesoProductividad: "2",
};

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function fechaToDayKey(fecha: string | Date): string | null {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return null;
  return dayKey(d);
}

function chipTone(tarea: CalendarTarea): string {
  const limite = getTareaLimiteStatus(tarea.fechaLimite, tarea.estado);
  if (limite.vencida) return "border-red-200 bg-red-50 text-red-900";
  if (tarea.estado === "COMPLETADA") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tarea.estado === "EN_PROCESO" || tarea.estado === "PENDIENTE_APROBACION") {
    return "border-blue-200 bg-blue-50 text-blue-900";
  }
  if (limite.proxima) return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-white text-slate-800";
}

function taskTooltip(tarea: CalendarTarea): string {
  const parts = [
    tarea.titulo,
    `${tarea.user.nombre} ${tarea.user.apellido}`,
    labelEstadoTarea(tarea.estado),
  ];
  if (tarea.objetivo?.titulo) parts.push(tarea.objetivo.titulo);
  const limite = getTareaLimiteStatus(tarea.fechaLimite, tarea.estado);
  if (limite.fechaLabel) parts.push(`Límite ${limite.fechaLabel}`);
  return parts.join(" · ");
}

function TaskChip({
  tarea,
  compact,
  onOpen,
}: {
  tarea: CalendarTarea;
  compact?: boolean;
  onOpen: (t: CalendarTarea) => void;
}) {
  const initials = getInitials(tarea.user.nombre, tarea.user.apellido);
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_TYPE, tarea.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(tarea);
      }}
      className={cn(
        "flex w-full items-start gap-1 rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:ring-1 hover:ring-primary/30",
        chipTone(tarea)
      )}
      title={taskTooltip(tarea)}
    >
      <span
        className="mt-0.5 shrink-0 rounded bg-black/5 px-1 py-px text-[9px] font-bold tabular-nums"
        aria-hidden
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("font-medium", compact && "line-clamp-2")}>{tarea.titulo}</span>
        {!compact && (
          <span className="mt-0.5 block text-[10px] opacity-70">
            {labelEstadoTarea(tarea.estado)}
          </span>
        )}
      </span>
    </button>
  );
}

export function ManagerTaskCalendar({
  tareas,
  usuarios,
  objetivos = [],
  onRefresh,
}: ManagerTaskCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<CalendarTarea | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [dayDetail, setDayDetail] = useState<{ key: string; day: Date } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showCompletadasSinFecha, setShowCompletadasSinFecha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(""), 2800);
    return () => window.clearTimeout(t);
  }, [flash]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const { byDay, sinFechaAbiertas, sinFechaCompletadas } = useMemo(() => {
    const map = new Map<string, CalendarTarea[]>();
    const undatedOpen: CalendarTarea[] = [];
    const undatedDone: CalendarTarea[] = [];
    for (const t of tareas) {
      if (!t.fechaLimite) {
        if (t.estado === "COMPLETADA") undatedDone.push(t);
        else undatedOpen.push(t);
        continue;
      }
      const key = fechaToDayKey(t.fechaLimite);
      if (!key) {
        if (t.estado === "COMPLETADA") undatedDone.push(t);
        else undatedOpen.push(t);
        continue;
      }
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.prioridad - b.prioridad || a.titulo.localeCompare(b.titulo));
    }
    const byPrio = (a: CalendarTarea, b: CalendarTarea) =>
      a.prioridad - b.prioridad || a.titulo.localeCompare(b.titulo);
    undatedOpen.sort(byPrio);
    undatedDone.sort(byPrio);
    return {
      byDay: map,
      sinFechaAbiertas: undatedOpen,
      sinFechaCompletadas: undatedDone,
    };
  }, [tareas]);

  const sinFechaCount = sinFechaAbiertas.length + sinFechaCompletadas.length;

  const monthLabel = format(cursor, "MMMM yyyy", { locale: es });
  const datedInMonth = useMemo(() => {
    let n = 0;
    for (const [key, list] of byDay) {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y!, (m ?? 1) - 1, d);
      if (isSameMonth(date, cursor)) n += list.length;
    }
    return n;
  }, [byDay, cursor]);

  const dayDetailTasks = dayDetail ? byDay.get(dayDetail.key) ?? [] : [];

  const objetivosDelEmpleado = createForm.userId
    ? objetivos.filter((o) => o.userId === createForm.userId)
    : [];

  async function patchFechaLimite(tareaId: string, dateStr: string | null) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tareas/${tareaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaLimite: dateStr ? toFechaLimiteIso(dateStr) ?? null : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "No se pudo actualizar la fecha");
        return false;
      }
      await onRefresh();
      setFlash(
        dateStr
          ? `Fecha actualizada al ${format(new Date(`${dateStr}T12:00:00`), "d MMM", { locale: es })}`
          : "Fecha límite quitada"
      );
      return true;
    } catch {
      setError("Error de conexión al actualizar la fecha");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnDay(day: Date, e: React.DragEvent) {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData(DND_TYPE);
    if (!id) return;
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;
    const nextKey = dayKey(day);
    if (tarea.fechaLimite) {
      const currentKey = fechaToDayKey(tarea.fechaLimite);
      if (currentKey === nextKey) return;
    }
    await patchFechaLimite(id, nextKey);
  }

  function openTarea(t: CalendarTarea) {
    setSelected(t);
    setError("");
    setEditFecha(t.fechaLimite ? fechaToDayKey(t.fechaLimite) ?? "" : "");
  }

  async function saveSelectedFecha() {
    if (!selected) return;
    const ok = await patchFechaLimite(selected.id, editFecha || null);
    if (ok) setSelected(null);
  }

  function openCreateForDay(day: Date) {
    setCreateForm({ ...emptyCreateForm, fechaLimite: dayKey(day) });
    setShowCreate(true);
    setError("");
  }

  async function createTarea() {
    if (!createForm.titulo.trim() || !createForm.userId) {
      setError("Completá título y empleado");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: createForm.titulo.trim(),
          tiempoEstimado: Number(createForm.tiempoEstimado) || 60,
          userId: createForm.userId,
          objetivoId: createForm.objetivoId || undefined,
          fechaLimite: toFechaLimiteIso(createForm.fechaLimite),
          evaluaProductividad: createForm.evaluaProductividad,
          pesoProductividad: Number(createForm.pesoProductividad),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "No se pudo crear la tarea");
        return;
      }
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      await onRefresh();
      setFlash("Tarea creada");
    } catch {
      setError("Error de conexión al crear la tarea");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center font-display text-lg font-bold capitalize tracking-tight text-slate-900">
            {monthLabel}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Hoy
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <CalendarDays className="mr-1.5 inline h-4 w-4" />
          {datedInMonth} con límite este mes
          {sinFechaCount > 0 ? ` · ${sinFechaCount} sin fecha` : ""}
        </p>
      </div>

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash}
        </div>
      )}

      {error && !selected && !showCreate && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b bg-slate-50/80 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-1 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(7rem,1fr)]">
            {days.map((day) => {
              const key = dayKey(day);
              const dayTasks = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              const isOver = dragOverKey === key;
              const visible = dayTasks.slice(0, 3);
              const more = dayTasks.length - visible.length;

              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverKey(key);
                  }}
                  onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                  onDrop={(e) => handleDropOnDay(day, e)}
                  className={cn(
                    "group/day relative min-h-[7rem] border-b border-r border-slate-100 p-1.5 transition-colors",
                    !inMonth && "bg-slate-50/60 text-slate-400",
                    isOver && "bg-primary/5 ring-2 ring-inset ring-primary/30",
                    today && inMonth && "bg-sky-50/40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-1 px-0.5">
                    <button
                      type="button"
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        today && "bg-primary text-primary-foreground",
                        !today && inMonth && "text-slate-700 hover:bg-slate-100",
                        !inMonth && "text-slate-400"
                      )}
                      onClick={() => setDayDetail({ key, day })}
                      title="Ver tareas del día"
                    >
                      {format(day, "d")}
                    </button>
                    <div className="flex items-center gap-0.5">
                      {dayTasks.length > 0 && (
                        <button
                          type="button"
                          className="text-[10px] tabular-nums text-muted-foreground hover:text-foreground"
                          onClick={() => setDayDetail({ key, day })}
                        >
                          {dayTasks.length}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-primary group-hover/day:opacity-100"
                        title="Nueva tarea este día"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateForDay(day);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {visible.map((t) => (
                      <TaskChip key={t.id} tarea={t} compact onOpen={openTarea} />
                    ))}
                    {more > 0 && (
                      <button
                        type="button"
                        className="w-full rounded-md px-1 py-0.5 text-left text-[10px] font-medium text-primary hover:bg-primary/5"
                        onClick={() => setDayDetail({ key, day })}
                      >
                        +{more} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2">
            <p className="text-sm font-semibold text-slate-900">Sin fecha</p>
            <p className="text-xs text-muted-foreground">
              Arrastrá al calendario para asignar límite
            </p>
          </div>
          <div
            className={cn(
              "max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2",
              dragOverKey === "sin-fecha" && "ring-2 ring-primary/30"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey("sin-fecha");
            }}
            onDragLeave={() => setDragOverKey((k) => (k === "sin-fecha" ? null : k))}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOverKey(null);
              const id = e.dataTransfer.getData(DND_TYPE);
              if (!id) return;
              await patchFechaLimite(id, null);
            }}
          >
            {sinFechaCount === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                Todas las tareas visibles tienen fecha límite
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {sinFechaAbiertas.length === 0 ? (
                    <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
                      Sin abiertas pendientes de fecha
                    </p>
                  ) : (
                    sinFechaAbiertas.map((t) => (
                      <TaskChip key={t.id} tarea={t} onOpen={openTarea} />
                    ))
                  )}
                </div>
                {sinFechaCompletadas.length > 0 && (
                  <div className="border-t border-slate-200/80 pt-2">
                    <button
                      type="button"
                      className="mb-1.5 flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-[11px] font-medium text-muted-foreground hover:bg-white/80"
                      onClick={() => setShowCompletadasSinFecha((v) => !v)}
                    >
                      <span>Completadas ({sinFechaCompletadas.length})</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition",
                          showCompletadasSinFecha && "rotate-180"
                        )}
                      />
                    </button>
                    {showCompletadasSinFecha && (
                      <div className="space-y-1.5">
                        {sinFechaCompletadas.map((t) => (
                          <TaskChip key={t.id} tarea={t} onOpen={openTarea} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {datedInMonth === 0 && sinFechaCount === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No hay tareas con este filtro. Usá el + en un día para crear una.
        </p>
      )}

      {/* Detalle del día */}
      <Dialog open={!!dayDetail} onOpenChange={(open) => !open && setDayDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {dayDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {format(dayDetail.day, "EEEE d MMMM", { locale: es })}
                </DialogTitle>
                <DialogDescription>
                  {dayDetailTasks.length === 0
                    ? "Sin tareas con límite este día"
                    : `${dayDetailTasks.length} tarea${dayDetailTasks.length === 1 ? "" : "s"}`}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {dayDetailTasks.map((t) => (
                  <TaskChip key={t.id} tarea={t} onOpen={openTarea} />
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setDayDetail(null)}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    openCreateForDay(dayDetail.day);
                    setDayDetail(null);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva tarea
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Editar fecha */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.titulo}</DialogTitle>
                <DialogDescription>
                  {selected.user.nombre} {selected.user.apellido}
                  {selected.objetivo ? ` · ${selected.objetivo.titulo}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={badgeVariantEstadoTarea(selected.estado)}>
                    {labelEstadoTarea(selected.estado)}
                  </Badge>
                  <TareaFechaLimiteBadge
                    fechaLimite={selected.fechaLimite}
                    estado={selected.estado}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-fecha">Fecha límite</Label>
                  <Input
                    id="cal-fecha"
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vaciar y guardar quita la fecha (vuelve a “Sin fecha”).
                  </p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelected(null)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={saving}
                    onClick={saveSelectedFecha}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar fecha
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Crear tarea */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setCreateForm(emptyCreateForm);
            setError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
            <DialogDescription>
              Se crea con el mismo flujo que el kanban
              {createForm.fechaLimite
                ? ` · límite ${format(new Date(`${createForm.fechaLimite}T12:00:00`), "d MMM yyyy", { locale: es })}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                className="rounded-xl"
                value={createForm.titulo}
                onChange={(e) => setCreateForm({ ...createForm, titulo: e.target.value })}
                placeholder="Ej: Revisar informe mensual"
              />
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={createForm.userId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, userId: e.target.value, objetivoId: "" })
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
                  value={createForm.objetivoId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, objetivoId: e.target.value })
                  }
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estimado (min)</Label>
                <Input
                  type="number"
                  className="rounded-xl"
                  value={createForm.tiempoEstimado}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, tiempoEstimado: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={createForm.fechaLimite}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fechaLimite: e.target.value })
                  }
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={saving}
                onClick={createTarea}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
