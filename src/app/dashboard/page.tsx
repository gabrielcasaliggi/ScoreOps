"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { PremioFormulaExplainer } from "@/components/dashboard/premio-formula-explainer";
import { formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [managerSummary, setManagerSummary] = useState<{
    resumen: {
      totalEmpleados: number;
      puntajePremioPromedio?: number;
      kpiPromedioEquipo: number;
    };
    periodo: {
      label: string;
      mesesCalculoLabel?: string;
      mesPagoLabel?: string;
      diasHastaLiquidacion: number;
      liquidacionPendiente?: boolean;
    };
  } | null>(null);
  const [personalData, setPersonalData] = useState<{
    kpiCompliance: Parameters<typeof EmployeeDashboard>[0]["kpiCompliance"];
    kpiPromedio: number;
    temporalEfficiency: Parameters<typeof EmployeeDashboard>[0]["temporalEfficiency"];
    productivityBonus: Parameters<typeof EmployeeDashboard>[0]["productivityBonus"];
    periodo: Parameters<typeof EmployeeDashboard>[0]["periodo"];
    tareasPorEstado: Parameters<typeof EmployeeDashboard>[0]["tareasPorEstado"];
  } | null>(null);
  const [tareas, setTareas] = useState<Parameters<typeof EmployeeDashboard>[0]["tareas"]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    setLoadError("");
    setLoading(true);

    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setLoadError("No se pudo cargar tu sesión. Intentá de nuevo.");
        return;
      }

      const me = await meRes.json();
      setRole(me.user?.role ?? null);

      if (me.user?.role === "ADMINISTRADOR" || me.user?.role === "GERENTE") {
        const statsRes = await fetch("/api/stats/equipo?periodo=actual");
        if (!statsRes.ok) {
          setLoadError("No se pudieron cargar las estadísticas del equipo.");
          return;
        }
        const stats = await statsRes.json();
        setManagerSummary({ resumen: stats.resumen, periodo: stats.periodo });
      } else {
        const [statsRes, tareasRes] = await Promise.all([
          fetch("/api/stats/personal?periodo=actual"),
          fetch("/api/tareas"),
        ]);
        if (!statsRes.ok || !tareasRes.ok) {
          setLoadError("No se pudieron cargar tus datos. Intentá de nuevo.");
          return;
        }
        const stats = await statsRes.json();
        const tareasData = await tareasRes.json();
        setPersonalData(stats);
        setTareas(Array.isArray(tareasData) ? tareasData : []);
      }
    } catch {
      setLoadError("Error de conexión. Verificá tu red e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Cargando dashboard...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" className="rounded-xl" onClick={loadData}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (role === "ADMINISTRADOR" || role === "GERENTE") {
    if (!managerSummary) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">No hay datos disponibles.</p>
          <Button variant="outline" className="rounded-xl" onClick={loadData}>
            Reintentar
          </Button>
        </div>
      );
    }
    const isAdmin = role === "ADMINISTRADOR";
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de gestión</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cálculo {managerSummary.periodo.mesesCalculoLabel ?? managerSummary.periodo.label}
            {" · "}
            Pago con haberes de {managerSummary.periodo.mesPagoLabel ?? "—"}
            {managerSummary.periodo.liquidacionPendiente &&
              managerSummary.periodo.diasHastaLiquidacion > 0 && (
                <span> · faltan {managerSummary.periodo.diasHastaLiquidacion} días</span>
              )}
          </p>
        </div>
        <PremioFormulaExplainer compact />
        <AiInsightsPanel />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Puntaje premio equipo"
            value={managerSummary.resumen.puntajePremioPromedio ?? "—"}
            hint="Art. 49 — % del sueldo básico + antigüedad"
            icon={Award}
            variant="violet"
          />
          <StatCard
            label="Empleados"
            value={managerSummary.resumen.totalEmpleados}
            icon={Users}
            variant="slate"
          />
          <StatCard
            label="KPI promedio"
            value={formatPercent(managerSummary.resumen.kpiPromedioEquipo)}
            icon={TrendingUp}
            variant="emerald"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/equipo">
            <Button className="rounded-xl shadow-md">
              {isAdmin ? "Coordinación y gráficos" : "Estadísticas de mi área"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/tareas">
            <Button variant="outline" className="rounded-xl bg-white/80">
              Abrir Kanban
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!personalData) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">No hay datos disponibles.</p>
        <Button variant="outline" className="rounded-xl" onClick={loadData}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi tablero de trabajo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seguí tus tareas y tu puntaje para el premio semestral
        </p>
      </div>
      <AiInsightsPanel />
      <EmployeeDashboard {...personalData} tareas={tareas} onRefresh={loadData} />
    </div>
  );
}
