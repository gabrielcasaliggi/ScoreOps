"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  periodoId: string;
  evento: string;
  puntajeBase: number;
  inasistencias: number;
  multiplicador: number;
  puntajeFinal: number;
  detalle: Record<string, unknown>;
  createdAt: string;
  user: {
    nombre: string;
    apellido: string;
    legajo: string | null;
    area: { nombre: string };
  };
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [periodoId, setPeriodoId] = useState("actual");
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (periodoId && periodoId !== "all") {
      const periodMap: Record<string, string> = {
        actual: "2026-S1",
        anterior: "2025-S2",
      };
      params.set("periodoId", periodMap[periodoId] ?? periodoId);
    }
    const res = await fetch(`/api/auditoria/puntajes?${params}`);
    setLogs(await res.json());
    setLoading(false);
  }, [periodoId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRecalcular() {
    setRecalculando(true);
    setMessage("");
    const params = periodoId === "all" ? "?periodo=actual" : `?periodo=${periodoId}`;
    const res = await fetch(`/api/auditoria/puntajes/recalcular${params}`, {
      method: "POST",
    });
    const data = await res.json();
    setRecalculando(false);
    if (res.ok) {
      setMessage(`Se registraron ${data.registrados} cálculos para ${data.periodoId}`);
      load();
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando auditoría...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardCheck className="h-6 w-6 shrink-0" />
            Auditoría de puntajes
          </h1>
        }
        description="Historial inmutable de cálculos del premio semestral"
        actions={
          <>
            <InputPeriodo value={periodoId} onChange={setPeriodoId} />
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleRecalcular}
              disabled={recalculando}
            >
              <RefreshCw className={cn("h-4 w-4", recalculando && "animate-spin")} />
              Recalcular y registrar
            </Button>
          </>
        }
      />

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros de auditoría</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Faltas</th>
                <th className="px-4 py-3">Mult.</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Evento</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-3 text-xs">
                    {new Date(log.createdAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    {log.user.nombre} {log.user.apellido}
                    <span className="block text-xs text-muted-foreground">
                      {log.user.area.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.periodoId}</td>
                  <td className="px-4 py-3">{log.puntajeBase}</td>
                  <td className="px-4 py-3">{log.inasistencias}</td>
                  <td className="px-4 py-3">×{log.multiplicador}</td>
                  <td className="px-4 py-3 font-semibold">{log.puntajeFinal}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{log.evento.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              Sin registros. Usá &quot;Recalcular y registrar&quot; para generar el historial.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InputPeriodo({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">Todos los periodos</option>
      <option value="actual">Semestre actual</option>
      <option value="anterior">Semestre anterior</option>
    </select>
  );
}
