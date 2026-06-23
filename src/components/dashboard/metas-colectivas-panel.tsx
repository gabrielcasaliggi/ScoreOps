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

const LABELS: Record<MetaColectiva["tipo"], string> = {
  REPARACIONES: "c) Reparaciones — % resueltos mismo día",
  PULSOS: "d) Pulsos — % vs semestre anterior",
  COBRANZAS: "e) Cobranzas — % sobre facturación",
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
      setMessage("Metas colectivas actualizadas");
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas colectivas Art. 49
        </CardTitle>
        <CardDescription>
          Tramos c, d y e del premio semestral · {periodoLabel}
          {!isAdmin && " · Solo lectura"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metas.map((meta) => {
          const cumplida = meta.valorActual >= meta.valorMeta;
          return (
            <div key={meta.tipo} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{LABELS[meta.tipo]}</p>
                <span
                  className={`text-xs font-semibold ${cumplida ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {cumplida ? "Cumplida" : "Pendiente"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Meta (%)</Label>
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
