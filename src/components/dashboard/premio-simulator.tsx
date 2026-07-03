"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SimulacionResult {
  actual: { kpiPromedio: number; eficienciaEvaluable: number; puntajePremio: number };
  simulado: { kpiPromedio: number; eficienciaEvaluable: number; puntajeGestionInterna: number };
  delta: number;
  nota: string;
}

export function PremioSimulator() {
  const [kpi, setKpi] = useState("70");
  const [eficiencia, setEficiencia] = useState("80");
  const [result, setResult] = useState<SimulacionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function simular() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/premio/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpiPromedio: Number(kpi),
          eficienciaEvaluable: Number(eficiencia),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo simular");
        return;
      }
      setResult(data);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4 text-violet-600" />
          Simulador de premio
        </CardTitle>
        <CardDescription>
          Probá escenarios de KPI y eficiencia antes del cierre del semestre
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>KPI promedio (%)</Label>
            <Input
              type="number"
              min={0}
              max={200}
              className="rounded-xl"
              value={kpi}
              onChange={(e) => setKpi(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Eficiencia evaluable (%)</Label>
            <Input
              type="number"
              min={0}
              max={200}
              className="rounded-xl"
              value={eficiencia}
              onChange={(e) => setEficiencia(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={simular} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Simular escenario
        </Button>
        {result && (
          <div className="rounded-xl border bg-violet-50/40 p-4 space-y-2 text-sm">
            <p>
              Premio actual (Art. 49):{" "}
              <strong>{result.actual.puntajePremio}%</strong>
            </p>
            <p>
              Con KPI {result.simulado.kpiPromedio}% y eficiencia{" "}
              {result.simulado.eficienciaEvaluable}% → gestión interna{" "}
              <strong>{result.simulado.puntajeGestionInterna}%</strong>
            </p>
            <p className="text-muted-foreground text-xs">{result.nota}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
