"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PremioCitation {
  id: string;
  fuente: string;
  texto: string;
  valor?: string | number;
}

interface PremioPaso {
  id: string;
  titulo: string;
  explicacion: string;
  activo: boolean;
  porcentaje: number;
  citas: PremioCitation[];
}

interface PremioExplicacion {
  titulo: string;
  resumen: string;
  porcentajeTotal: number;
  pasos: PremioPaso[];
  citasGenerales: PremioCitation[];
  recomendaciones: string[];
}

export function PremioExplainerPanel() {
  const [data, setData] = useState<PremioExplicacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ai/premio-explicacion")
      .then((r) => r.json())
      .then((d) => setData(d.explicacion ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Analizando tu premio...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-violet-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-violet-600" />
              {data.titulo}
            </CardTitle>
            <CardDescription className="mt-1">{data.resumen}</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-violet-700 border-violet-200">
            {data.porcentajeTotal}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.pasos.length > 0 && (
          <div className="space-y-2">
            {data.pasos.map((paso) => (
              <div
                key={paso.id}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  paso.activo ? "border-emerald-200 bg-emerald-50/40" : "border-border/60 bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{paso.titulo}</p>
                  <Badge variant={paso.activo ? "default" : "secondary"} className="text-[10px]">
                    {paso.activo ? `+${paso.porcentaje}%` : "No aplica"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{paso.explicacion}</p>
                {paso.citas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {paso.citas.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-violet-800 border border-violet-100"
                        title={c.texto}
                      >
                        <BookOpen className="h-3 w-3" />
                        {c.fuente}
                        {c.valor != null && `: ${c.valor}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 text-xs font-medium text-violet-700 hover:text-violet-900"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          {open ? "Ocultar" : "Ver"} fuentes y recomendaciones
        </button>

        {open && (
          <div className="space-y-3 animate-fade-in">
            {data.citasGenerales.length > 0 && (
              <div className="rounded-lg bg-violet-50/50 p-3 text-xs space-y-1">
                <p className="font-semibold text-violet-900">Fuentes del cálculo</p>
                {data.citasGenerales.map((c) => (
                  <p key={c.id} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{c.fuente}:</span> {c.texto}
                    {c.valor != null && ` (${c.valor})`}
                  </p>
                ))}
              </div>
            )}
            {data.recomendaciones.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                {data.recomendaciones.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
