"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { OperationsDashboard } from "@/components/dashboard/operations-dashboard";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [personalData, setPersonalData] = useState<{
    kpiCompliance: Parameters<typeof EmployeeDashboard>[0]["kpiCompliance"];
    kpiPromedio: number;
    temporalEfficiency: Parameters<typeof EmployeeDashboard>[0]["temporalEfficiency"];
    productivityBonus: Parameters<typeof EmployeeDashboard>[0]["productivityBonus"];
    periodo: Parameters<typeof EmployeeDashboard>[0]["periodo"];
    tareasPorEstado: Parameters<typeof EmployeeDashboard>[0]["tareasPorEstado"];
    latencias: Parameters<typeof EmployeeDashboard>[0]["latencias"];
    objetivos: Parameters<typeof EmployeeDashboard>[0]["objetivos"];
    comparacion: Parameters<typeof EmployeeDashboard>[0]["comparacion"];
  } | null>(null);
  const [tareas, setTareas] = useState<Parameters<typeof EmployeeDashboard>[0]["tareas"]>([]);
  const [premioHabilitado, setPremioHabilitado] = useState(true);
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
      const userRole = me.user?.role ?? null;
      setRole(userRole);
      setIsAdmin(userRole === "ADMINISTRADOR");
      setPremioHabilitado(me.user?.premioHabilitado !== false);

      if (userRole === "ADMINISTRADOR" || userRole === "GERENTE") {
        setLoading(false);
        return;
      }

      const [statsRes, tareasRes] = await Promise.all([
        fetch("/api/stats/personal?periodo=actual&compare=anterior"),
        fetch("/api/tareas"),
      ]);
      if (!statsRes.ok || !tareasRes.ok) {
        setLoadError("No se pudieron cargar tus datos. Intentá de nuevo.");
        return;
      }
      const stats = await statsRes.json();
      const tareasData = await tareasRes.json();
      setPersonalData({
        kpiCompliance: stats.kpiCompliance,
        kpiPromedio: stats.kpiPromedio,
        temporalEfficiency: stats.temporalEfficiency,
        productivityBonus: stats.productivityBonus,
        periodo: stats.periodo,
        tareasPorEstado: stats.tareasPorEstado,
        latencias: stats.latencias,
        objetivos: stats.objetivos ?? [],
        comparacion: stats.comparacion ?? null,
      });
      setTareas(Array.isArray(tareasData) ? tareasData : []);
    } catch {
      setLoadError("Error de conexión. Verificá tu red e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <DashboardSkeleton />;

  if (loadError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="amber"
        title="No se pudo cargar el tablero"
        description={loadError}
        action={
          <Button variant="outline" className="rounded-xl" onClick={loadData}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (role === "ADMINISTRADOR" || role === "GERENTE") {
    return (
      <OperationsDashboard isAdmin={isAdmin} premioHabilitado={premioHabilitado} />
    );
  }

  if (!personalData) {
    return (
      <EmptyState
        title="Sin datos disponibles"
        description="Todavía no hay información personal para mostrar."
      />
    );
  }

  return (
    <div className="space-y-8">
      <EmployeeDashboard
        {...personalData}
        tareas={tareas}
        premioHabilitado={premioHabilitado}
        onRefresh={loadData}
      />
      <AiInsightsPanel />
    </div>
  );
}
