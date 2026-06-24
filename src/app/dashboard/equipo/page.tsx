"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { formatPercent } from "@/lib/utils";

interface PersonaRow {
  userId: string;
  nombre: string;
  apellido: string;
  area: string;
  tareasAbiertas: number;
  tareasVencidas: number;
  objetivosActivos: number;
  kpiPromedio: number;
}

interface TeamsData {
  alcance: { tipo: "area"; areaNombre: string } | { tipo: "global" };
  porPersona: PersonaRow[];
  porArea?: { areaId: string; area: string; empleados: number; tareasAbiertas: number; kpiPromedio: number }[];
}

export default function EquipoPage() {
  const [role, setRole] = useState<string | null>(null);
  const [data, setData] = useState<TeamsData | null>(null);
  const [areaFilter, setAreaFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/stats/operaciones");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? null));
    load();
  }, [load]);

  const isAdmin = role === "ADMINISTRADOR";

  const personas =
    data?.porPersona.filter((p) => !areaFilter || p.area === areaFilter) ?? [];

  const areas = [...new Set(data?.porPersona.map((p) => p.area) ?? [])];

  if (loading || !role) {
    return <p className="text-muted-foreground">Cargando equipos...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 shrink-0" />
            {isAdmin ? "Equipos" : "Mi equipo"}
          </h1>
        }
        description={
          isAdmin
            ? "Seguimiento por persona y área en toda la cooperativa"
            : `Personas y carga de trabajo — ${data?.alcance.tipo === "area" ? data.alcance.areaNombre : ""}`
        }
        actions={
          <Link href="/dashboard/tareas">
            <Button className="rounded-xl">
              <ClipboardList className="h-4 w-4 mr-2" />
              Abrir Kanban
            </Button>
          </Link>
        }
      />

      {isAdmin && areas.length > 0 && (
        <select
          className="h-10 rounded-xl border border-input bg-background px-4 text-sm"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      {isAdmin && data?.porArea && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.porArea
            .filter((a) => !areaFilter || a.area === areaFilter)
            .map((a) => (
              <Card key={a.areaId} className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{a.area}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground">{a.empleados} empleados</p>
                  <p>
                    <span className="font-semibold">{a.tareasAbiertas}</span> tareas abiertas
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>KPI área</span>
                      <span className="font-medium">{formatPercent(a.kpiPromedio)}</span>
                    </div>
                    <Progress value={a.kpiPromedio} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Detalle por persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {personas.map((p) => (
            <div
              key={p.userId}
              className="rounded-2xl border p-4 flex flex-wrap items-center gap-4 justify-between"
            >
              <div>
                <p className="font-semibold">
                  {p.nombre} {p.apellido}
                </p>
                {isAdmin && (
                  <p className="text-xs text-muted-foreground">{p.area}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{p.tareasAbiertas} abiertas</Badge>
                {p.tareasVencidas > 0 && (
                  <Badge variant="destructive">{p.tareasVencidas} vencidas</Badge>
                )}
                <Badge variant="outline">{p.objetivosActivos} objetivos</Badge>
                <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                  KPI {formatPercent(p.kpiPromedio)}
                </Badge>
              </div>
              <Link href={`/dashboard/tareas?userId=${p.userId}`}>
                <Button variant="ghost" size="sm">
                  Tareas
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          ))}
          {personas.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Sin empleados en este filtro</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
