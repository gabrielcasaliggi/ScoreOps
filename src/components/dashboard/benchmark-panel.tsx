"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPercent } from "@/lib/utils";

interface BenchmarkMetric {
  id: string;
  label: string;
  valorPropio: number;
  valorArea: number;
  valorOrg: number;
  deltaVsArea: number;
  deltaVsOrg: number;
  unidad: "%" | "pts";
}

interface PersonalBenchmark {
  areaNombre: string;
  resumen: string;
  metricas: BenchmarkMetric[];
}

interface AreaRow {
  area: string;
  empleados: number;
  kpiPromedio: number;
  premioPromedio: number;
  vsOrgKpi: number;
  vsOrgPremio: number;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.5) {
    return <Badge variant="outline" className="text-[10px]">≈ promedio</Badge>;
  }
  const up = delta > 0;
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] gap-0.5", up ? "text-emerald-700 border-emerald-200" : "text-amber-700 border-amber-200")}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta} pp
    </Badge>
  );
}

export function BenchmarkPanel() {
  const [scope, setScope] = useState<"personal" | "org" | "area">("personal");
  const [personal, setPersonal] = useState<PersonalBenchmark | null>(null);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [orgPromedios, setOrgPromedios] = useState<{ kpi: number; premio: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/benchmark")
      .then((r) => r.json())
      .then((d) => {
        setScope(d.scope ?? "personal");
        setPersonal(d.benchmark ?? null);
        setAreas(d.areas ?? []);
        setOrgPromedios(d.orgPromedios ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Calculando benchmark...
        </CardContent>
      </Card>
    );
  }

  if (scope === "personal" && personal) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Benchmark — {personal.areaNombre} vs organización
          </CardTitle>
          <CardDescription>{personal.resumen}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {personal.metricas.map((m) => (
            <div key={m.id} className="rounded-xl border px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{m.label}</p>
                <div className="flex gap-2">
                  <DeltaBadge delta={m.deltaVsArea} />
                  <span className="text-xs text-muted-foreground">vs área</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <p className="text-muted-foreground">Vos</p>
                  <p className="font-semibold text-lg">{formatPercent(m.valorPropio)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Área</p>
                  <p className="font-semibold">{formatPercent(m.valorArea)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Org</p>
                  <p className="font-semibold">{formatPercent(m.valorOrg)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if ((scope === "org" || scope === "area") && areas.length > 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Benchmark interno por área
          </CardTitle>
          {orgPromedios && (
            <CardDescription>
              Promedio {scope === "area" ? "área" : "org"}: KPI {formatPercent(orgPromedios.kpi)} · Premio{" "}
              {orgPromedios.premio}%
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {areas.map((a) => (
            <div key={a.area} className="rounded-xl border px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{a.area}</p>
                <p className="text-xs text-muted-foreground">{a.empleados} empleados</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline">KPI {formatPercent(a.kpiPromedio)}</Badge>
                <Badge variant="outline">Premio {a.premioPromedio}%</Badge>
                <DeltaBadge delta={a.vsOrgPremio} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return null;
}
