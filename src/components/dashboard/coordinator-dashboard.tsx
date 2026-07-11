"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Calendar, RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { TeamDashboard } from "@/components/dashboard/team-dashboard";
import { MetasColectivasPanel } from "@/components/dashboard/metas-colectivas-panel";
import { PremioFormulaExplainer } from "@/components/dashboard/premio-formula-explainer";
import { BenchmarkPanel } from "@/components/dashboard/benchmark-panel";
import type { EmployeeProductivity } from "@/lib/productivity";
import { formatPercent } from "@/lib/utils";

interface AreaOption {
  id: string;
  nombre: string;
}

interface EquipoStatsResponse {
  resumen: {
    totalEmpleados: number;
    kpiPromedioEquipo: number;
    eficienciaPromedioEquipo: number;
    tareasCompletadas: number;
    tareasEvaluablesCompletadas?: number;
    puntajePremioPromedio?: number;
  };
  empleados: EmployeeProductivity[];
  porArea?: { area: string; empleados: number; puntajePromedio: number }[];
  periodo: {
    id: string;
    label: string;
    mesesCalculoLabel?: string;
    mesPagoLabel?: string;
    liquidacionDescripcion?: string;
    esActual: boolean;
    fechaLiquidacion: string;
    diasHastaLiquidacion: number;
    liquidacionPendiente?: boolean;
  };
  areas?: AreaOption[];
  alcance: { tipo: "area"; areaNombre: string } | { tipo: "global" };
  actualizadoEn: string;
}

interface CoordinatorDashboardProps {
  isAdmin: boolean;
  userAreaNombre?: string;
}

const REFRESH_MS = 45_000;

export function CoordinatorDashboard({ isAdmin, userAreaNombre }: CoordinatorDashboardProps) {
  const [data, setData] = useState<EquipoStatsResponse | null>(null);
  const [periodo, setPeriodo] = useState<"actual" | "anterior">("actual");
  const [areaId, setAreaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams({ periodo });
    if (isAdmin && areaId) params.set("areaId", areaId);

    const res = await fetch(`/api/stats/equipo?${params}`);
    const json = await res.json();
    setData(json);
    setLastRefresh(new Date());
    setLoading(false);
  }, [periodo, areaId, isAdmin]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  if (loading && !data) {
    return <DashboardSkeleton stats={3} panels={2} />;
  }

  if (!data) return null;

  const scopeLabel =
    data.alcance.tipo === "area"
      ? data.alcance.areaNombre
      : areaId
        ? (data.areas?.find((a) => a.id === areaId)?.nombre ?? "Área")
        : "Toda la cooperativa";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-primary/25">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              {isAdmin ? "Consejo de administración" : "Supervisión de área"}
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Premio a la productividad
            </h1>
            <p className="mt-2 text-sm text-white/85 leading-relaxed">
              Cálculo: {data.periodo.mesesCalculoLabel ?? data.periodo.label} ·{" "}
              {data.periodo.liquidacionDescripcion} ·{" "}
              <span className="font-medium">{scopeLabel}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <Radio className="h-3 w-3 live-dot" />
              En vivo
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-xl bg-white/20 text-white border-0 hover:bg-white/30"
              onClick={() => loadData()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Puntaje promedio</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.resumen.puntajePremioPromedio ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Evaluables</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.resumen.tareasEvaluablesCompletadas ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm flex items-center gap-3">
            <Calendar className="h-8 w-8 text-white/60 shrink-0" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">Pago estimado</p>
              <p className="text-sm font-semibold">
                {data.periodo.mesPagoLabel}
                {data.periodo.liquidacionPendiente && data.periodo.diasHastaLiquidacion > 0 && (
                  <span className="font-normal text-white/75">
                    {" "}
                    · {data.periodo.diasHastaLiquidacion}d
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        {lastRefresh && (
          <p className="relative mt-4 text-[11px] text-white/60">
            Última actualización: {lastRefresh.toLocaleTimeString("es-ES")} · refresco cada 45s
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-xl border border-input bg-white/90 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as "actual" | "anterior")}
        >
          <option value="actual">Semestre actual</option>
          <option value="anterior">Semestre anterior</option>
        </select>
        {isAdmin && data.areas && data.areas.length > 0 && (
          <select
            className="h-10 rounded-xl border border-input bg-white/90 px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">Todas las áreas</option>
            {data.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Empleados"
          value={data.resumen.totalEmpleados}
          variant="slate"
        />
        <StatCard
          label="KPI promedio"
          value={formatPercent(data.resumen.kpiPromedioEquipo)}
          variant="emerald"
        />
        <StatCard
          label="Premio Art. 49"
          value={
            data.resumen.puntajePremioPromedio != null
              ? `${data.resumen.puntajePremioPromedio}%`
              : "—"
          }
          hint="Promedio % sueldo ref. (máx. 50%)"
          icon={Award}
          variant="violet"
        />
      </div>

      <MetasColectivasPanel isAdmin={isAdmin} />

      <PremioFormulaExplainer />

      <BenchmarkPanel />

      <TeamDashboard
        resumen={data.resumen}
        empleados={data.empleados}
        porArea={data.porArea}
        periodoLabel={data.periodo.label}
      />
    </div>
  );
}
