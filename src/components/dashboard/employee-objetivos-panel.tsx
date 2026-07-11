"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/utils";

export interface ObjetivoResumen {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  kpisCount: number;
  tareasCount: number;
  kpiPromedio: number;
  diasRestantes: number;
  proximoVencer: boolean;
}

interface EmployeeObjetivosPanelProps {
  objetivos: ObjetivoResumen[];
}

export function EmployeeObjetivosPanel({ objetivos }: EmployeeObjetivosPanelProps) {
  if (objetivos.length === 0) {
    return (
      <Card className="dash-panel border-0 shadow-none h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-teal-700" />
            Mis objetivos del semestre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Target}
            title="Sin objetivos asignados"
            description="Pedile a tu gerente que cargue los del período."
            className="py-6"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dash-panel border-0 shadow-none h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-teal-700" />
          Mis objetivos del semestre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {objetivos.map((obj) => (
          <div
            key={obj.id}
            className="rounded-xl border border-border/60 bg-white/50 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{obj.titulo}</p>
                {obj.descripcion && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {obj.descripcion}
                  </p>
                )}
              </div>
              {obj.proximoVencer && (
                <Badge variant="warning" className="shrink-0 text-[10px]">
                  Vence en {obj.diasRestantes} día(s)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(obj.fechaInicio).toLocaleDateString("es-AR")} —{" "}
              {new Date(obj.fechaFin).toLocaleDateString("es-AR")}
              {" · "}
              {obj.kpisCount} KPI(s) · {obj.tareasCount} tarea(s)
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avance KPI</span>
                <span className="font-medium text-emerald-600">
                  {formatPercent(obj.kpiPromedio)}
                </span>
              </div>
              <Progress value={obj.kpiPromedio} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
