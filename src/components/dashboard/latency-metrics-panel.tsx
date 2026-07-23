"use client";

import { Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatLatencyMinutes,
  latencyComposition,
  type AggregatedLatencies,
} from "@/lib/task-latency";
import { cn } from "@/lib/utils";

interface LatencyMetricsPanelProps {
  latencias: AggregatedLatencies;
  title?: string;
  description?: string;
}

function Stage({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "amber" | "blue" | "emerald";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/80 text-amber-950",
    blue: "border-blue-200 bg-blue-50/80 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
  };
  const valueTone = {
    amber: "text-amber-900",
    blue: "text-blue-900",
    emerald: "text-emerald-900",
  };

  return (
    <div className={cn("rounded-xl border px-3.5 py-3", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums tracking-tight", valueTone[tone])}>
        {value}
      </p>
      <p className="mt-0.5 text-xs opacity-75">{sub}</p>
    </div>
  );
}

export function LatencyMetricsPanel({
  latencias,
  title = "Tiempos de resolución",
  description = "Recorrido promedio desde que se asigna la tarea hasta que se completa",
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
            Sin tareas completadas en el período. Los tiempos se miden cuando una tarea pasa por
            Pendiente → En proceso → Completada.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { ociosoPct, activoPct } = latencyComposition(latencias);
  const ociosoLabel = formatLatencyMinutes(latencias.tiempoOcioso.avg);
  const activoLabel = formatLatencyMinutes(latencias.tiempoActivo.avg);
  const totalLabel = formatLatencyMinutes(latencias.tiempoTotal.avg);
  const pctOcioso = latencias.pctOcioso.avg;

  return (
    <Card className="dash-panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-slate-500" />
          {title}
        </CardTitle>
        <CardDescription>
          {description} · {latencias.count} tarea{latencias.count === 1 ? "" : "s"} completada
          {latencias.count === 1 ? "" : "s"}
          {latencias.conInicioMedible > 0
            ? ` · ${latencias.conInicioMedible} con inicio medible`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Timeline del ciclo */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[520px] items-center gap-2 text-xs sm:gap-3">
            <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700">
              Asignada
            </span>
            <div className="h-px flex-1 bg-amber-300" />
            <span className="shrink-0 text-center font-medium text-amber-800">
              Espera
              <span className="mt-0.5 block text-[11px] tabular-nums text-amber-700">
                {ociosoLabel}
              </span>
            </span>
            <div className="h-px flex-1 bg-amber-300" />
            <span className="shrink-0 rounded-lg bg-blue-100 px-2.5 py-1.5 font-semibold text-blue-800">
              En proceso
            </span>
            <div className="h-px flex-1 bg-blue-300" />
            <span className="shrink-0 text-center font-medium text-blue-800">
              Resolviendo
              <span className="mt-0.5 block text-[11px] tabular-nums text-blue-700">
                {activoLabel}
              </span>
            </span>
            <div className="h-px flex-1 bg-emerald-300" />
            <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1.5 font-semibold text-emerald-800">
              Completada
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stage
            label="Tardó en comenzar"
            value={ociosoLabel}
            sub={
              latencias.demoraInicio.median != null
                ? `Mediana ${formatLatencyMinutes(latencias.demoraInicio.median)} · tiempo en cola`
                : "Tiempo ocioso / en cola antes de empezar"
            }
            tone="amber"
          />
          <Stage
            label="Estuvo resolviendo"
            value={activoLabel}
            sub={
              latencias.tiempoActivo.median != null
                ? `Mediana ${formatLatencyMinutes(latencias.tiempoActivo.median)} · trabajo activo`
                : "Tiempo en En proceso hasta el cierre"
            }
            tone="blue"
          />
          <Stage
            label="Ciclo total"
            value={totalLabel}
            sub={
              latencias.tiempoTotal.median != null
                ? `Mediana ${formatLatencyMinutes(latencias.tiempoTotal.median)} · asignación → cierre`
                : "Desde que la recibió hasta terminarla"
            }
            tone="emerald"
          />
        </div>

        {/* Barra ocioso vs activo */}
        {(ociosoPct > 0 || activoPct > 0) && (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-medium text-slate-700">Composición del ciclo</p>
              {pctOcioso != null && (
                <p className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-amber-800">{pctOcioso}%</span> del tiempo fue
                  espera / ocioso
                </p>
              )}
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
              {ociosoPct > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${ociosoPct}%` }}
                  title={`Espera ${ociosoLabel}`}
                />
              )}
              {activoPct > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${activoPct}%` }}
                  title={`Resolviendo ${activoLabel}`}
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Espera / ocioso {ociosoPct}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Trabajo activo {activoPct}%
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Para medir bien la espera, la tarea debe pasar por <strong>En proceso</strong> antes de
          completarse. El ciclo total incluye también el tiempo en aprobación, si aplica.
        </p>
      </CardContent>
    </Card>
  );
}

/** Celda compacta: promedio de ciclo total (o —). */
export function latencyCell(latencias: AggregatedLatencies | undefined): string {
  return formatLatencyMinutes(latencias?.tiempoTotal.avg);
}

/** Celda con breakdown: espera · activo · total */
export function latencyBreakdownCell(latencias: AggregatedLatencies | undefined): string {
  if (!latencias || latencias.count === 0) return "—";
  const o = formatLatencyMinutes(latencias.tiempoOcioso.avg);
  const a = formatLatencyMinutes(latencias.tiempoActivo.avg);
  const t = formatLatencyMinutes(latencias.tiempoTotal.avg);
  return `${o} · ${a} · ${t}`;
}
