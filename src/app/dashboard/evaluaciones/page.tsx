"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Ciclo {
  id: string;
  titulo: string;
  periodoId: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  _count?: { respuestas: number };
}

interface Pendiente {
  cicloId: string;
  evaluadoId: string;
  evaluadoNombre: string;
  evaluadorId: string;
  rol: string;
  competencias: string[];
  progreso: number;
  total: number;
}

interface Resultado {
  evaluadoId: string;
  nombre: string;
  apellido: string;
  area: string;
  puntajeGlobal: number;
  porCompetencia: { competencia: string; puntaje: number }[];
}

const ROL_LABEL: Record<string, string> = {
  AUTOEVALUACION: "Autoevaluación",
  GERENTE: "Como gerente",
  PAR: "Como par",
  SUBORDINADO: "Como subordinado",
};

export default function EvaluacionesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cicloActivo, setCicloActivo] = useState<Ciclo | null>(null);
  const [selectedCicloId, setSelectedCicloId] = useState("");
  const [evaluando, setEvaluando] = useState<Pendiente | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nuevoCiclo, setNuevoCiclo] = useState({
    titulo: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const isAdmin = role === "ADMINISTRADOR";
  const isManager = role === "ADMINISTRADOR" || role === "GERENTE";

  const load = useCallback(async () => {
    const [meRes, ciclosRes, pendRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/evaluaciones/ciclos"),
      fetch("/api/evaluaciones/pendientes"),
    ]);
    const me = await meRes.json();
    setRole(me.user?.role ?? null);

    const ciclosData = await ciclosRes.json();
    setCiclos(ciclosData);

    const pendData = await pendRes.json();
    setPendientes(pendData.pendientes ?? []);
    setCicloActivo(pendData.ciclo);

    const cicloId = pendData.ciclo?.id || ciclosData[0]?.id;
    if (cicloId && (me.user?.role === "ADMINISTRADOR" || me.user?.role === "GERENTE")) {
      setSelectedCicloId((prev) => prev || cicloId);
      const resRes = await fetch(`/api/evaluaciones/resultados?cicloId=${cicloId}`);
      setResultados(await resRes.json());
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCrearCiclo(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/evaluaciones/ciclos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoCiclo),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear ciclo");
      return;
    }
    setMessage("Ciclo creado correctamente");
    setNuevoCiclo({ titulo: "", fechaInicio: "", fechaFin: "" });
    load();
  }

  async function handleCerrarCiclo(id: string) {
    await fetch(`/api/evaluaciones/ciclos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: false }),
    });
    load();
  }

  function abrirEvaluacion(p: Pendiente) {
    setEvaluando(p);
    const initial: Record<string, number> = {};
    p.competencias.forEach((c) => {
      initial[c] = 3;
    });
    setScores(initial);
    setComentario("");
    setError("");
  }

  async function enviarEvaluacion(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluando) return;

    const res = await fetch("/api/evaluaciones/respuestas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cicloId: evaluando.cicloId,
        evaluadoId: evaluando.evaluadoId,
        rol: evaluando.rol,
        respuestas: evaluando.competencias.map((competencia) => ({
          competencia,
          puntaje: scores[competencia] ?? 3,
          comentario: comentario || undefined,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      return;
    }
    setEvaluando(null);
    setMessage("Evaluación guardada");
    load();
  }

  async function onCicloChange(cicloId: string) {
    setSelectedCicloId(cicloId);
    if (isManager) {
      const res = await fetch(`/api/evaluaciones/resultados?cicloId=${cicloId}`);
      setResultados(await res.json());
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-6 w-6" />
          Evaluaciones 360°
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autoevaluación, gerente, pares y subordinados con ponderación configurable
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {cicloActivo && (
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/50 px-5 py-4 text-sm">
          <span className="font-semibold text-violet-800">Ciclo activo: {cicloActivo.titulo}</span>
          <span className="text-muted-foreground">
            {" "}
            · hasta {new Date(cicloActivo.fechaFin).toLocaleDateString("es-AR")}
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Mis evaluaciones pendientes
          </CardTitle>
          <CardDescription>
            {pendientes.length === 0
              ? "No tenés evaluaciones pendientes"
              : `${pendientes.length} evaluación(es) por completar`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendientes.map((p) => (
            <div
              key={`${p.evaluadoId}-${p.rol}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 bg-white/80"
            >
              <div>
                <p className="font-medium">{p.evaluadoNombre}</p>
                <p className="text-xs text-muted-foreground">{ROL_LABEL[p.rol] ?? p.rol}</p>
                <Progress
                  value={(p.progreso / p.total) * 100}
                  className="mt-2 h-1.5 w-40"
                />
              </div>
              <Button size="sm" onClick={() => abrirEvaluacion(p)}>
                Evaluar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrar ciclos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCrearCiclo} className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Título</Label>
                <Input
                  value={nuevoCiclo.titulo}
                  onChange={(e) => setNuevoCiclo({ ...nuevoCiclo, titulo: e.target.value })}
                  placeholder="Evaluación S1 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input
                  type="date"
                  value={nuevoCiclo.fechaInicio}
                  onChange={(e) => setNuevoCiclo({ ...nuevoCiclo, fechaInicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={nuevoCiclo.fechaFin}
                  onChange={(e) => setNuevoCiclo({ ...nuevoCiclo, fechaFin: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="sm:col-span-4 w-fit">
                Abrir nuevo ciclo
              </Button>
            </form>

            <div className="space-y-2">
              {ciclos.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{c.titulo}</span>
                    <span className="text-muted-foreground ml-2">
                      {c.periodoId} · {c._count?.respuestas ?? 0} respuestas
                    </span>
                    {c.activo && <Badge className="ml-2">Activo</Badge>}
                  </div>
                  {c.activo && (
                    <Button size="sm" variant="outline" onClick={() => handleCerrarCiclo(c.id)}>
                      Cerrar ciclo
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {isManager && ciclos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resultados del ciclo
            </CardTitle>
            <select
              className="mt-2 h-10 rounded-md border border-input bg-background px-3 text-sm max-w-xs"
              value={selectedCicloId}
              onChange={(e) => onCicloChange(e.target.value)}
            >
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Puntaje global</th>
                  <th className="px-4 py-3">Competencias</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r) => (
                  <tr key={r.evaluadoId} className="border-t">
                    <td className="px-4 py-3">
                      {r.nombre} {r.apellido}
                    </td>
                    <td className="px-4 py-3">{r.area}</td>
                    <td className="px-4 py-3 font-semibold">{r.puntajeGlobal}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.porCompetencia.map((c) => `${c.competencia}: ${c.puntaje}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resultados.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">Sin resultados aún</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!evaluando} onOpenChange={() => setEvaluando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Evaluar a {evaluando?.evaluadoNombre}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={enviarEvaluacion} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {evaluando && (ROL_LABEL[evaluando.rol] ?? evaluando.rol)} · Escala 1 a 5
            </p>
            {evaluando?.competencias.map((comp) => (
              <div key={comp} className="space-y-2">
                <Label>{comp}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={scores[comp] === n ? "default" : "outline"}
                      onClick={() => setScores({ ...scores, [comp]: n })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>Comentario (opcional)</Label>
              <Input value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Enviar evaluación
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
