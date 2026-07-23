"use client";

import { Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  formatLatencyMinutes,
  type AggregatedLatencies,
} from "@/lib/task-latency";

interface LatencyMetricsPanelProps {
  latencias: AggregatedLatencies;
  title?: string;
  description?: string;
}

function metricHint(avg: number | null, median: number | null): string {
  if (avg == null) return "Sin datos medibles";
  if (median == null) return "Promedio del período";
  return `Mediana ${formatLatencyMinutes(median)}`;
}

export function LatencyMetricsPanel({
  latencias,
  title = "Tiempos de resolución",
  description = "Desde la asignación hasta el inicio y el cierre (tareas completadas del período)",
}: LatencyMetricsPanelProps) {
  if (latencias.count === 0) {
    return (
      <Card className="dash-panel border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-slate-500" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sin tareas completadas en el período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dash-panel border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-slate-500" />
          {title}
        </CardTitle>
        <CardDescription>
          {description} · {latencias.count} tarea{latencias.count === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Hasta empezar"
            value={formatLatencyMinutes(latencias.demoraInicio.avg)}
            hint={metricHint(latencias.demoraInicio.avg, latencias.demoraInicio.median)}
            variant="amber"
          />
          <StatCard
            label="Trabajo activo"
            value={formatLatencyMinutes(latencias.tiempoActivo.avg)}
            hint={metricHint(latencias.tiempoActivo.avg, latencias.tiempoActivo.median)}
            variant="blue"
          />
          <StatCard
            label="Ciclo total"
            value={formatLatencyMinutes(latencias.tiempoTotal.avg)}
            hint={metricHint(latencias.tiempoTotal.avg, latencias.tiempoTotal.median)}
            variant="emerald"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          La demora hasta empezar excluye tareas completadas sin pasar por “En proceso”.
        </p>
      </CardContent>
    </Card>
  );
}

/** Celda compacta: promedio de ciclo total (o —). */
export function latencyCell(latencias: AggregatedLatencies | undefined): string {
  return formatLatencyMinutes(latencias?.tiempoTotal.avg);
}
