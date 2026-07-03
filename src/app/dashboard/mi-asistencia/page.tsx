"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

interface Registro {
  id: string;
  fecha: string;
  tipo: string;
  tipoLabel: string;
  minutosTarde: number | null;
  observacion: string | null;
}

interface MiAsistenciaData {
  periodo: { label: string };
  registros: Registro[];
  resumen: { total: number; porTipo: Record<string, number> };
  impactoPremio: {
    porcentajeTotal: number;
    inasistenciasInjustificadas: number;
    tramosActivos: string[];
  } | null;
}

export default function MiAsistenciaPage() {
  const [data, setData] = useState<MiAsistenciaData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/asistencia/mi");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando asistencia...</p>;
  }

  if (!data) {
    return <p className="text-sm text-destructive">No se pudo cargar tu asistencia.</p>;
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <PageHeader
        title={
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Mi asistencia
          </h1>
        }
        description={`Presentismo del período ${data.periodo.label}`}
      />

      {data.impactoPremio && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Impacto en premio semestral</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Premio proyectado</p>
              <p className="text-2xl font-bold text-violet-600">
                {data.impactoPremio.porcentajeTotal}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tramos activos</p>
              <p className="text-2xl font-bold uppercase">
                {data.impactoPremio.tramosActivos.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Inasistencias injustificadas</p>
              <p className="text-2xl font-bold">{data.impactoPremio.inasistenciasInjustificadas}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{data.resumen.total} registro(s)</Badge>
          {Object.entries(data.resumen.porTipo).map(([tipo, count]) => (
            <Badge key={tipo} variant="outline">
              {tipo.replace(/_/g, " ")}: {count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.registros.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin registros en este período.
            </p>
          )}
          {data.registros.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{new Date(r.fecha).toLocaleDateString("es-AR")}</p>
                {r.observacion && (
                  <p className="text-xs text-muted-foreground">{r.observacion}</p>
                )}
              </div>
              <Badge variant="outline">{r.tipoLabel}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
