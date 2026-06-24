"use client";

import { useCallback, useEffect, useState } from "react";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { OperationsDashboard } from "@/components/dashboard/operations-dashboard";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";

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
      const userRole = me.user?.role ?? null;
      setRole(userRole);
      setIsAdmin(userRole === "ADMINISTRADOR");

      if (userRole === "ADMINISTRADOR" || userRole === "GERENTE") {
        setLoading(false);
        return;
      }

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
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    );
  }

  if (role === "ADMINISTRADOR" || role === "GERENTE") {
    return <OperationsDashboard isAdmin={isAdmin} />;
  }

  if (!personalData) {
    return <p className="text-muted-foreground">No hay datos disponibles.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi tablero</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tus tareas y objetivos del día — el premio semestral se calcula aparte
        </p>
      </div>
      <AiInsightsPanel />
      <EmployeeDashboard {...personalData} tareas={tareas} onRefresh={loadData} />
    </div>
  );
}
