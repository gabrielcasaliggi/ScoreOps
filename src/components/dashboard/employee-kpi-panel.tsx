"use client";

import { useState } from "react";
import { Loader2, Pencil, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/utils";

interface KpiItem {
  kpiId: string;
  nombre: string;
  unidad: string;
  valorMeta: number;
  valorActual: number;
  cumplimiento: number;
}

interface EmployeeKpiPanelProps {
  kpiCompliance: KpiItem[];
  onRefresh: () => void;
}

export function EmployeeKpiPanel({ kpiCompliance, onRefresh }: EmployeeKpiPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (kpiCompliance.length === 0) {
    return (
      <Card className="dash-panel border-0 shadow-none h-full">
        <CardHeader>
          <CardTitle className="text-base">Mis KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="Todavía no tenés KPIs"
            description="Cuando tu gerente defina objetivos, vas a poder registrar el avance acá."
            className="py-6"
          />
        </CardContent>
      </Card>
    );
  }

  async function saveKpi(kpiId: string) {
    const valor = Number(draft);
    if (Number.isNaN(valor) || valor < 0) {
      setError("Ingresá un número válido.");
      return;
    }
    setError("");
    setSavingId(kpiId);
    try {
      const res = await fetch(`/api/kpis/${kpiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorActual: valor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el avance.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.workflowPendiente) {
        setError("");
        setEditingId(null);
        alert(data.message ?? "Solicitud enviada al gerente.");
      } else {
        setEditingId(null);
      }
      onRefresh();
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="dash-panel border-0 shadow-none h-full">
      <CardHeader>
        <CardTitle className="text-base">Mis KPIs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Registrá tu avance actual; los cambios pueden requerir aprobación del gerente.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {kpiCompliance.map((kpi) => (
          <div key={kpi.kpiId} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{kpi.nombre}</span>
              {editingId === kpi.kpiId ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-24 rounded-lg text-sm"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">/ {kpi.valorMeta} {kpi.unidad}</span>
                  <Button
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    disabled={savingId === kpi.kpiId}
                    onClick={() => saveKpi(kpi.kpiId)}
                  >
                    {savingId === kpi.kpiId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {kpi.valorActual} / {kpi.valorMeta} {kpi.unidad}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg px-2 text-xs"
                    onClick={() => {
                      setEditingId(kpi.kpiId);
                      setDraft(String(kpi.valorActual));
                      setError("");
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Actualizar
                  </Button>
                </div>
              )}
            </div>
            <Progress value={kpi.cumplimiento} className="h-2.5 rounded-full" />
            <p className="text-right text-xs font-medium text-emerald-600">
              {formatPercent(kpi.cumplimiento)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
