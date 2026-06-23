"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AiInsight {
  id: string;
  tipo: "alerta" | "sugerencia" | "positivo";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  accion?: string;
}

const ICONS = {
  alerta: AlertTriangle,
  sugerencia: Lightbulb,
  positivo: CheckCircle2,
};

const STYLES = {
  alerta: "border-red-200 bg-red-50/50",
  sugerencia: "border-amber-200 bg-amber-50/50",
  positivo: "border-emerald-200 bg-emerald-50/50",
};

export function AiInsightsPanel() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/insights")
      .then((r) => r.json())
      .then((data) => setInsights(data.insights ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Analizando datos...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <CardTitle className="text-lg">Análisis inteligente</CardTitle>
        </div>
        <CardDescription>
          Recomendaciones automáticas basadas en KPIs, tareas y eficiencia temporal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = ICONS[insight.tipo];
          return (
            <div
              key={insight.id}
              className={cn("rounded-lg border p-4", STYLES[insight.tipo])}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{insight.titulo}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {insight.prioridad}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.descripcion}</p>
                  {insight.accion && (
                    <p className="text-xs font-medium text-primary mt-1">
                      Acción: {insight.accion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
