"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManagerKanban } from "@/components/tasks/manager-kanban";
import { formatMinutes } from "@/lib/utils";

interface Tarea {
  id: string;
  titulo: string;
  estado: string;
  tiempoEstimado: number;
  tiempoReal: number | null;
  prioridad: number;
  startedAt: string | null;
  completedAt: string | null;
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

interface Objetivo {
  id: string;
  titulo: string;
  userId: string;
}

const ESTADO_VARIANT: Record<string, "secondary" | "warning" | "success"> = {
  PENDIENTE: "secondary",
  EN_PROCESO: "warning",
  COMPLETADA: "success",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
};

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [areaNombre, setAreaNombre] = useState<string>();
  const [vista, setVista] = useState<"kanban" | "lista">("kanban");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadTareas = useCallback(async () => {
    setLoadError("");
    try {
      const url = filtro ? `/api/tareas?estado=${filtro}` : "/api/tareas";
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
  }, [filtro]);

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
        const manager =
          data.user?.role === "ADMINISTRADOR" || data.user?.role === "GERENTE";
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isManager ? "Tablero Kanban" : "Mis tareas"}
        </h1>
        {isManager && (
          <p className="text-sm text-muted-foreground mt-1">
            Asigná y supervisá el flujo de trabajo de tu equipo
          </p>
        )}
      </div>

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
            <div className="mb-4 flex justify-end gap-2">
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
          )}
          {isManager && vista === "kanban" ? (
            <ManagerKanban
              tareas={tareas as Parameters<typeof ManagerKanban>[0]["tareas"]}
              usuarios={usuarios}
              objetivos={objetivos}
              areaNombre={areaNombre}
              onRefresh={loadTareas}
            />
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                {["", "PENDIENTE", "EN_PROCESO", "COMPLETADA"].map((estado) => (
                  <button
                    key={estado || "all"}
                    onClick={() => setFiltro(estado)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      filtro === estado
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {estado ? ESTADO_LABEL[estado] : "Todas"}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {tareas.length === 0 && (
                  <p className="text-muted-foreground">No hay tareas para mostrar.</p>
                )}
                {tareas.map((tarea) => (
                  <Card key={tarea.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tarea.titulo}</p>
                          {tarea.evaluaProductividad && (
                            <Badge variant="outline" className="text-[10px] text-violet-600">
                              Premio x{tarea.pesoProductividad}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tarea.user.nombre} {tarea.user.apellido}
                          {tarea.objetivo && ` · ${tarea.objetivo.titulo}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Est: {formatMinutes(tarea.tiempoEstimado)}
                          {tarea.tiempoReal != null &&
                            ` · Real: ${formatMinutes(tarea.tiempoReal)}`}
                        </span>
                        <Badge variant={ESTADO_VARIANT[tarea.estado] ?? "secondary"}>
                          {ESTADO_LABEL[tarea.estado] ?? tarea.estado}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
