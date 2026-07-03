"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { formatPercent } from "@/lib/utils";

interface EjecutivoData {
  periodo: { label: string };
  plantillaPremio: { nombre: string; tienePremioMonetario: boolean };
  salud: { score: number; etiqueta: string };
  resumen: {
    empleadosActivos: number;
    areas: number;
    kpiPromedioOrg: number;
    premioPromedioOrg: number;
    tareasAbiertas: number;
    tareasVencidas: number;
    objetivosActivos: number;
    objetivosEnRiesgo: number;
  };
  porArea: {
    areaId: string;
    nombre: string;
    empleados: number;
    kpiPromedio: number;
    premioPromedio: number;
    tareasAbiertas: number;
    tareasVencidas: number;
  }[];
  distribucionCarga: {
    promedio: number;
    max: number;
    min: number;
    sobrecargados: {
      userId: string;
      nombre: string;
      apellido: string;
      area: string;
      tareasAbiertas: number;
    }[];
    conCapacidad: {
      userId: string;
      nombre: string;
      apellido: string;
      area: string;
      tareasAbiertas: number;
    }[];
  };
}

const SALUD_VARIANT: Record<string, "emerald" | "slate" | "violet"> = {
  Saludable: "emerald",
  Atención: "violet",
  Crítico: "slate",
};

export function ExecutiveDashboard() {
  const [data, setData] = useState<EjecutivoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stats/ejecutivo");
      if (!res.ok) {
        setError("No se pudo cargar el dashboard ejecutivo.");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Cargando vista ejecutiva...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error || "Sin datos"}</p>
        <Button variant="outline" onClick={load}>
          Reintentar
        </Button>
      </div>
    );
  }

  const saludVariant = SALUD_VARIANT[data.salud.etiqueta] ?? "slate";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vista ejecutiva</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.periodo.label} · Plantilla: {data.plantillaPremio.nombre}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Salud operativa"
          value={`${data.salud.score}/100`}
          hint={data.salud.etiqueta}
          icon={TrendingUp}
          variant={saludVariant}
        />
        <StatCard
          label="KPI promedio"
          value={formatPercent(data.resumen.kpiPromedioOrg)}
          hint={`${data.resumen.empleadosActivos} empleados · ${data.resumen.areas} áreas`}
          icon={BarChart3}
          variant="blue"
        />
        <StatCard
          label="Tareas vencidas"
          value={data.resumen.tareasVencidas}
          hint={`${data.resumen.tareasAbiertas} abiertas en total`}
          icon={AlertTriangle}
          variant={data.resumen.tareasVencidas > 0 ? "slate" : "emerald"}
        />
        <StatCard
          label={data.plantillaPremio.tienePremioMonetario ? "Premio prom." : "Score gestión"}
          value={
            data.plantillaPremio.tienePremioMonetario
              ? `${data.resumen.premioPromedioOrg}%`
              : formatPercent(data.resumen.kpiPromedioOrg)
          }
          hint={`${data.resumen.objetivosEnRiesgo} objetivos en riesgo`}
          icon={Users}
          variant="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por área</CardTitle>
            <CardDescription>KPI, premio y tareas por sector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.porArea.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin áreas configuradas.</p>
            ) : (
              data.porArea.map((a) => (
                <div key={a.areaId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.nombre}</span>
                    <span className="text-muted-foreground">
                      {a.empleados} emp. · KPI {formatPercent(a.kpiPromedio)}
                    </span>
                  </div>
                  <Progress value={Math.min(100, a.kpiPromedio)} className="h-2" />
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {data.plantillaPremio.tienePremioMonetario && (
                      <span>Premio {a.premioPromedio}%</span>
                    )}
                    <span>{a.tareasAbiertas} tareas abiertas</span>
                    {a.tareasVencidas > 0 && (
                      <span className="text-destructive">{a.tareasVencidas} vencidas</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de carga</CardTitle>
            <CardDescription>
              Promedio {data.distribucionCarga.promedio} tareas/empleado (máx{" "}
              {data.distribucionCarga.max}, mín {data.distribucionCarga.min})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.distribucionCarga.sobrecargados.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Sobrecargados
                </p>
                <ul className="space-y-2">
                  {data.distribucionCarga.sobrecargados.map((p) => (
                    <li
                      key={p.userId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>
                        {p.nombre} {p.apellido}
                        <span className="text-muted-foreground ml-1">({p.area})</span>
                      </span>
                      <Badge variant="outline">{p.tareasAbiertas} tareas</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.distribucionCarga.conCapacidad.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Con capacidad disponible</p>
                <ul className="space-y-2">
                  {data.distribucionCarga.conCapacidad.map((p) => (
                    <li
                      key={p.userId}
                      className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm"
                    >
                      <span>
                        {p.nombre} {p.apellido}
                        <span className="text-muted-foreground ml-1">({p.area})</span>
                      </span>
                      <Badge variant="outline">{p.tareasAbiertas} tareas</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.distribucionCarga.sobrecargados.length === 0 &&
              data.distribucionCarga.conCapacidad.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  La carga está distribuida de forma equilibrada.
                </p>
              )}

            <Link href="/dashboard/tareas">
              <Button variant="outline" size="sm" className="w-full rounded-xl mt-2">
                Ver tablero de tareas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
