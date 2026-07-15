"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MetaColectiva {
  id: string;
  periodoId: string;
  tipo: "REPARACIONES" | "PULSOS" | "COBRANZAS";
  valorMeta: number;
  valorActual: number;
  observacion: string | null;
}

const LABELS: Record<MetaColectiva["tipo"], { titulo: string; ayuda: string }> = {
  REPARACIONES: {
    titulo: "c) Reparaciones",
    ayuda: "Meta típica: 95% de reclamos resueltos el mismo día.",
  },
  PULSOS: {
    titulo: "d) Pulsos",
    ayuda: "Meta típica: alcanzar o superar el 100% del semestre anterior.",
  },
  COBRANZAS: {
    titulo: "e) Cobranzas",
    ayuda: "Meta típica: cobrar al menos el 80% de lo facturado.",
  },
};

export function MetasColectivasPanel({ isAdmin }: { isAdmin: boolean }) {
  const [metas, setMetas] = useState<MetaColectiva[]>([]);
  const [periodoLabel, setPeriodoLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/premio/colectivas")
      .then((r) => r.json())
      .then((data) => {
        setMetas(data.metas ?? []);
        setPeriodoLabel(data.periodo?.label ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveMeta(meta: MetaColectiva) {
    setSaving(meta.tipo);
    setMessage("");
    const res = await fetch("/api/premio/colectivas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: meta.tipo,
        valorMeta: meta.valorMeta,
        valorActual: meta.valorActual,
      }),
    });
    setSaving(null);
    if (res.ok) {
      setMessage("Metas del equipo actualizadas");
    }
  }

  if (loading) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-base font-bold tracking-tight">
          <Target className="h-4 w-4 text-slate-700" />
          Metas del equipo
        </CardTitle>
        <CardDescription>
          Cada meta cumplida suma 5% del sueldo a toda el área.
          {periodoLabel ? ` · ${periodoLabel}` : ""}
          {!isAdmin && " · Solo lectura"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay metas cargadas para este semestre.
          </p>
        )}
        {metas.map((meta) => {
          const cumplida = meta.valorActual >= meta.valorMeta;
          const label = LABELS[meta.tipo];
          return (
            <div key={meta.tipo} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label.ayuda}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${cumplida ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {cumplida ? "Cumplida (+5%)" : "Pendiente"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Objetivo (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={meta.valorMeta}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setMetas((prev) =>
                        prev.map((m) =>
                          m.tipo === meta.tipo
                            ? { ...m, valorMeta: Number(e.target.value) }
                            : m
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avance actual (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={meta.valorActual}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setMetas((prev) =>
                        prev.map((m) =>
                          m.tipo === meta.tipo
                            ? { ...m, valorActual: Number(e.target.value) }
                            : m
                        )
                      )
                    }
                  />
                </div>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving === meta.tipo}
                  onClick={() => saveMeta(meta)}
                >
                  {saving === meta.tipo ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </div>
          );
        })}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
      </CardContent>
    </Card>
  );
}
