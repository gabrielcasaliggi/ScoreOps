"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ClipboardList, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManagerKanban } from "@/components/tasks/manager-kanban";
import { EmployeeKanban } from "@/components/tasks/employee-kanban";
import { TareaFechaLimiteBadge } from "@/components/tasks/tarea-fecha-limite";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutes } from "@/lib/utils";
import {
  ESTADOS_TAREA_FILTRO,
  badgeVariantEstadoTarea,
  getTareaLimiteStatus,
  labelEstadoTarea,
} from "@/lib/task-utils";

interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string | null;
  estado: string;
  tiempoEstimado: number;
  tiempoReal: number | null;
  prioridad: number;
  startedAt: string | null;
  completedAt: string | null;
  fechaLimite?: string | null;
  evaluaProductividad: boolean;
  pesoProductividad: number;
  workflowId?: string | null;
  user: { id: string; nombre: string; apellido: string };
  objetivo?: { id: string; titulo: string } | null;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
}

interface Objetivo {
  id: string;
  titulo: string;
  userId: string;
}

export function TareasView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("userId") ?? "";
  const vencidasFilter = searchParams.get("vencidas") === "1";
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [soloVencidas, setSoloVencidas] = useState(vencidasFilter);
  const [filtroUsuario, setFiltroUsuario] = useState(userIdFilter);
  const [role, setRole] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [areaNombre, setAreaNombre] = useState<string>();
  const [vista, setVista] = useState<"kanban" | "lista">("kanban");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const syncUrl = useCallback(
    (next: { userId?: string; vencidas?: boolean }) => {
      const params = new URLSearchParams();
      const userId = next.userId !== undefined ? next.userId : filtroUsuario;
      const vencidas = next.vencidas !== undefined ? next.vencidas : soloVencidas;
      if (userId) params.set("userId", userId);
      if (vencidas) params.set("vencidas", "1");
      const qs = params.toString();
      router.replace(qs ? `/dashboard/tareas?${qs}` : "/dashboard/tareas", { scroll: false });
    },
    [filtroUsuario, soloVencidas, router]
  );

  const loadTareas = useCallback(async () => {
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (filtro) params.set("estado", filtro);
      if (filtroUsuario) params.set("userId", filtroUsuario);
      const qs = params.toString();
      const url = qs ? `/api/tareas?${qs}` : "/api/tareas";
      const res = await fetch(url);
      if (!res.ok) {
        setLoadError("No se pudieron cargar las tareas.");
        return;
      }
      const data = await res.json();
      setTareas(Array.isArray(data) ? data : []);
    } catch {
      setLoadError("Error de conexión al cargar tareas.");
    }
  }, [filtro, filtroUsuario]);

  useEffect(() => {
    setFiltroUsuario(userIdFilter);
  }, [userIdFilter]);

  useEffect(() => {
    setSoloVencidas(vencidasFilter);
  }, [vencidasFilter]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setLoadError("");

      try {
        await loadTareas();

        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          setLoadError("No se pudo verificar tu sesión.");
          return;
        }

        const data = await meRes.json();
        const userRole = data.user?.role ?? null;
        const manager = userRole === "ADMINISTRADOR" || userRole === "GERENTE";
        setRole(userRole);
        setIsManager(manager);
        setAreaNombre(data.user?.areaNombre);

        if (manager) {
          const [usersRes, objsRes] = await Promise.all([
            fetch("/api/usuarios"),
            fetch("/api/objetivos"),
          ]);
          if (!usersRes.ok || !objsRes.ok) {
            setLoadError("No se pudieron cargar los datos del equipo.");
            return;
          }
          const [users, objs] = await Promise.all([usersRes.json(), objsRes.json()]);
          setUsuarios(Array.isArray(users) ? users : []);
          setObjetivos(
            Array.isArray(objs)
              ? objs.map((o: { id: string; titulo: string; user: { id: string } }) => ({
                  id: o.id,
                  titulo: o.titulo,
                  userId: o.user.id,
                }))
              : []
          );
        }
      } catch {
        setLoadError("Error de conexión. Intentá de nuevo.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [loadTareas]);

  const tareasVisibles = soloVencidas
    ? tareas.filter((t) => getTareaLimiteStatus(t.fechaLimite, t.estado).vencida)
    : tareas;

  function setFiltroUsuarioAndUrl(userId: string) {
    setFiltroUsuario(userId);
    syncUrl({ userId });
  }

  function setSoloVencidasAndUrl(value: boolean | ((prev: boolean) => boolean)) {
    setSoloVencidas((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      syncUrl({ vencidas: next });
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="text-2xl font-bold tracking-tight">
            {isManager ? "Gestión de tareas" : "Mis tareas"}
          </h1>
        }
        description={
          isManager
            ? "Kanban del equipo, asignaciones y seguimiento de vencimientos"
            : "Tu tablero personal de trabajo"
        }
      />

      {loading && (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Cargando tareas...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="flex h-40 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" className="rounded-xl" onClick={() => loadTareas()}>
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !loadError && (
        <>
          {isManager && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuarioAndUrl(e.target.value)}
                >
                  <option value="">Todos los empleados</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido}
                    </option>
                  ))}
                </select>
                <Button
                  variant={soloVencidas ? "destructive" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setSoloVencidasAndUrl((v) => !v)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Vencidas
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={vista === "kanban" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setVista("kanban")}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  variant={vista === "lista" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl bg-white/80"
                  onClick={() => setVista("lista")}
                >
                  <List className="mr-2 h-4 w-4" />
                  Lista
                </Button>
              </div>
            </div>
          )}

          {!isManager && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant={soloVencidas ? "destructive" : "outline"}
                size="sm"
                className="rounded-xl"
                onClick={() => setSoloVencidasAndUrl((v) => !v)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Vencidas
              </Button>
              <div className="flex gap-2">
                <Button
                  variant={vista === "kanban" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setVista("kanban")}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  variant={vista === "lista" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl bg-white/80"
                  onClick={() => setVista("lista")}
                >
                  <List className="mr-2 h-4 w-4" />
                  Lista
                </Button>
              </div>
            </div>
          )}

          {vista === "kanban" ? (
            isManager ? (
              <ManagerKanban
                tareas={tareasVisibles as Parameters<typeof ManagerKanban>[0]["tareas"]}
                usuarios={usuarios}
                objetivos={objetivos}
                areaNombre={areaNombre}
                filtroEmpleado={filtroUsuario}
                onRefresh={loadTareas}
              />
            ) : (
              <EmployeeKanban
                tareas={tareas as Parameters<typeof EmployeeKanban>[0]["tareas"]}
                onRefresh={loadTareas}
                soloVencidas={soloVencidas}
              />
            )
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFiltro("")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    filtro === ""
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Todas
                </button>
                {ESTADOS_TAREA_FILTRO.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setFiltro(estado)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      filtro === estado
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {labelEstadoTarea(estado, role)}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {tareasVisibles.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No hay tareas para mostrar"
                    description={
                      soloVencidas
                        ? "No hay tareas vencidas con este filtro."
                        : isManager
                          ? "Asigná trabajo al equipo o ampliá el filtro."
                          : "Cuando te asignen tareas, aparecen acá."
                    }
                    action={
                      isManager ? (
                        <Button
                          className="rounded-xl"
                          onClick={() => setVista("kanban")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ir al tablero para asignar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setVista("kanban")}
                        >
                          Ir al tablero
                        </Button>
                      )
                    }
                  />
                ) : (
                  tareasVisibles.map((tarea) => (
                    <Card key={tarea.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{tarea.titulo}</p>
                            <TareaFechaLimiteBadge
                              fechaLimite={tarea.fechaLimite}
                              estado={tarea.estado}
                            />
                            {tarea.evaluaProductividad && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-violet-600"
                              >
                                Premio x{tarea.pesoProductividad}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isManager && `${tarea.user.nombre} ${tarea.user.apellido}`}
                            {isManager && tarea.objetivo && " · "}
                            {tarea.objetivo?.titulo}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            Est: {formatMinutes(tarea.tiempoEstimado)}
                            {tarea.tiempoReal != null &&
                              ` · Real: ${formatMinutes(tarea.tiempoReal)}`}
                          </span>
                          <Badge variant={badgeVariantEstadoTarea(tarea.estado)}>
                            {labelEstadoTarea(tarea.estado, role)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
