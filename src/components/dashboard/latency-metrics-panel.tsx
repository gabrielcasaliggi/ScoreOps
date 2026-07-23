"use client";

import { useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatLatencyMinutes,
  latencyComposition,
  type AggregatedLatencies,
  type TaskLatencyRow,
} from "@/lib/task-latency";
import { cn } from "@/lib/utils";

interface LatencyMetricsPanelProps {
  latencias: AggregatedLatencies;
  title?: string;
  description?: string;
  /** Mostrar columna de empleado (dashboards de equipo). */
  showUser?: boolean;
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

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function MiniBar({ row }: { row: TaskLatencyRow }) {
  const ocioso = row.tiempoOciosoMin ?? 0;
  const activo = row.tiempoActivoMin ?? 0;
  const sum = ocioso + activo;
  if (sum <= 0) {
    return <div className="h-1.5 w-full rounded-full bg-slate-100" />;
  }
  const oPct = Math.round((ocioso / sum) * 100);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      {oPct > 0 && <div className="bg-amber-400" style={{ width: `${oPct}%` }} />}
      <div className="bg-blue-500" style={{ width: `${100 - oPct}%` }} />
    </div>
  );
}

export function LatencyMetricsPanel({
  latencias,
  title = "Tiempos de resolución",
  description = "Recorrido promedio desde que se asigna la tarea hasta que se completa",
  showUser = false,
}: LatencyMetricsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const hasDetalle = (latencias.porTarea?.length ?? 0) > 0;

  const visibleRows = useMemo(() => {
    const rows = latencias.porTarea ?? [];
    if (showAll || rows.length <= 8) return rows;
    return rows.slice(0, 8);
  }, [latencias.porTarea, showAll]);

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
  const showUserCol = showUser || latencias.porTarea.some((t) => t.userNombre);

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

        {hasDetalle && (
          <div>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">Detalle por tarea</p>
                <p className="text-xs text-muted-foreground">
                  Espera, tiempo resolviendo y ciclo de cada tarea completada
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="data-table w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Tarea</th>
                    {showUserCol && (
                      <th className="px-3 py-2.5 font-semibold">Empleado</th>
                    )}
                    <th className="px-3 py-2.5 text-right font-semibold">Espera</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Resolviendo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Ciclo</th>
                    <th className="px-3 py-2.5 text-right font-semibold">% ocioso</th>
                    <th className="px-3 py-2.5 font-semibold">Composición</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0">
                      <td className="max-w-[220px] truncate px-3 py-2.5 font-medium" title={row.titulo}>
                        {row.titulo}
                      </td>
                      {showUserCol && (
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.userNombre ?? "—"}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right tabular-nums text-amber-800">
                        {formatLatencyMinutes(row.tiempoOciosoMin)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-blue-800">
                        {formatLatencyMinutes(row.tiempoActivoMin)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-900">
                        {formatLatencyMinutes(row.tiempoTotalMin)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.pctOcioso != null ? `${row.pctOcioso}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5 w-28">
                        <MiniBar row={row} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                        {formatShortDate(row.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(latencias.porTarea?.length ?? 0) > 8 && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll
                    ? "Ver menos"
                    : `Ver las ${latencias.porTarea.length} tareas`}
                </Button>
              </div>
            )}
            {latencias.count > (latencias.porTarea?.length ?? 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando las {latencias.porTarea.length} más recientes de {latencias.count}{" "}
                completadas en el período.
              </p>
            )}
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
