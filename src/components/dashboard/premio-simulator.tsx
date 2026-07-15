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
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-base font-bold tracking-tight">
          <FlaskConical className="h-4 w-4 text-slate-700" />
          ¿Y si mejoramos KPI y eficiencia?
        </CardTitle>
        <CardDescription>
          Esta prueba mira solo el puntaje de gestión interna (KPI + eficiencia). El premio
          legal del 50% también depende de asistencia y metas de equipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Cumplimiento de KPI (%)</Label>
            <Input
              type="number"
              min={0}
              max={200}
              className="rounded-lg"
              value={kpi}
              onChange={(e) => setKpi(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Promedio de avance de objetivos medibles.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Eficiencia en tareas (%)</Label>
            <Input
              type="number"
              min={0}
              max={200}
              className="rounded-lg"
              value={eficiencia}
              onChange={(e) => setEficiencia(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Qué tan a tiempo se completan las tareas evaluables.
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={simular} disabled={loading} className="rounded-lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Probar escenario
        </Button>
        {result && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              Premio actual (asistencia + metas incluidas):{" "}
              <strong>{result.actual.puntajePremio}%</strong>
            </p>
            <p>
              Con KPI {result.simulado.kpiPromedio}% y eficiencia{" "}
              {result.simulado.eficienciaEvaluable}% → gestión interna{" "}
              <strong>{result.simulado.puntajeGestionInterna}%</strong>
              {result.delta !== 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({result.delta > 0 ? "+" : ""}
                  {result.delta} pp vs gestión interna actual)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{result.nota}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
