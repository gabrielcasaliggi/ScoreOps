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
import { Evaluacion360Explainer } from "@/components/dashboard/evaluacion360-explainer";

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
  porRol?: Partial<Record<string, number>>;
  porCompetencia: { competencia: string; puntaje: number }[];
}

interface CoberturaRol {
  rol: string;
  completa: boolean;
  respuestas: number;
  total: number;
}

interface Contribucion {
  rol: string;
  promedio: number;
  pesoEfectivoPct: number;
  aporte: number;
}

interface Pesos360 {
  autoevaluacion: number;
  gerente: number;
  par: number;
  subordinado: number;
}

const ROL_LABEL: Record<string, string> = {
  AUTOEVALUACION: "Autoevaluación",
  GERENTE: "Como gerente",
  PAR: "Como par",
  SUBORDINADO: "Como subordinado",
};

const ROL_RECIBIDO_LABEL: Record<string, string> = {
  AUTOEVALUACION: "Tu autoevaluación",
  GERENTE: "Evaluación del gerente",
  PAR: "Evaluación de pares",
  SUBORDINADO: "Evaluación de subordinados",
};

const ROL_HINT: Record<string, string> = {
  AUTOEVALUACION: "Puntuate en cada competencia según cómo te ves vos",
  GERENTE: "Evaluá a esta persona de tu equipo",
  PAR: "Evaluá a un compañero",
  SUBORDINADO: "Evaluá a tu jefe de área",
};

const ESCALA = [
  { n: 1, label: "Bajo" },
  { n: 2, label: "Regular" },
  { n: 3, label: "Bien" },
  { n: 4, label: "Muy bien" },
  { n: 5, label: "Excelente" },
];

export default function EvaluacionesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [miResultado, setMiResultado] = useState<Resultado | null>(null);
  const [miCobertura, setMiCobertura] = useState<CoberturaRol[]>([]);
  const [contribuciones, setContribuciones] = useState<Contribucion[]>([]);
  const [pesos, setPesos] = useState<Pesos360 | null>(null);
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
  const isEmployee = role === "EMPLEADO";

  const loadMisResultados = useCallback(async (cicloId?: string) => {
    const misRes = await fetch(
      cicloId
        ? `/api/evaluaciones/mis-resultados?cicloId=${cicloId}`
        : "/api/evaluaciones/mis-resultados"
    );
    if (!misRes.ok) return;
    const mis = await misRes.json();
    setMiResultado(mis.resultado ?? null);
    setMiCobertura(mis.cobertura ?? []);
    setContribuciones(mis.contribuciones ?? []);
    setPesos(mis.pesos ?? null);
  }, []);

  const load = useCallback(async () => {
    const [meRes, ciclosRes, pendRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/evaluaciones/ciclos"),
      fetch("/api/evaluaciones/pendientes"),
    ]);
    const me = await meRes.json();
    const userRole = me.user?.role ?? null;
    setRole(userRole);

    const ciclosData = await ciclosRes.json();
    setCiclos(ciclosData);

    const pendData = await pendRes.json();
    setPendientes(pendData.pendientes ?? []);
    setCicloActivo(pendData.ciclo);

    const cicloId = pendData.ciclo?.id || ciclosData[0]?.id;
    if (cicloId && (userRole === "ADMINISTRADOR" || userRole === "GERENTE")) {
      setSelectedCicloId((prev) => prev || cicloId);
      const resRes = await fetch(`/api/evaluaciones/resultados?cicloId=${cicloId}`);
      setResultados(await resRes.json());
    }

    if (userRole === "EMPLEADO" || userRole === "GERENTE") {
      await loadMisResultados(cicloId);
    }
  }, [loadMisResultados]);

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
    if (isEmployee || role === "GERENTE") {
      await loadMisResultados(cicloId);
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
          Feedback de competencias · no afecta el premio semestral
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <Evaluacion360Explainer
        pesos={pesos}
        variant={isEmployee ? "employee" : "manager"}
      />

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
            1. Lo que tenés que completar
          </CardTitle>
          <CardDescription>
            {pendientes.length === 0
              ? "No tenés formularios pendientes en este ciclo"
              : `${pendientes.length} formulario(s) por enviar · esto es lo que vos respondés`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendientes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Cuando haya un ciclo activo y te toque autoevaluarte o evaluar a tu gerente, aparece
              acá.
            </p>
          )}
          {pendientes.map((p) => (
            <div
              key={`${p.evaluadoId}-${p.rol}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 bg-white/80"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {p.rol === "AUTOEVALUACION"
                    ? "Tu autoevaluación"
                    : `Evaluá a ${p.evaluadoNombre}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ROL_HINT[p.rol] ?? ROL_LABEL[p.rol] ?? p.rol}
                </p>
                <Progress
                  value={(p.progreso / p.total) * 100}
                  className="mt-2 h-1.5 w-40"
                />
              </div>
              <Button size="sm" onClick={() => abrirEvaluacion(p)}>
                Completar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {(isEmployee || role === "GERENTE") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" />
              2. Cómo te evaluaron (tu resultado)
            </CardTitle>
            <CardDescription>
              Solo feedback hacia vos. El puntaje global mezcla los roles que ya respondieron, con
              pesos distintos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {miCobertura.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estado de cada mirada
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {miCobertura.map((c) => (
                    <div
                      key={c.rol}
                      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                    >
                      <span>{ROL_RECIBIDO_LABEL[c.rol] ?? c.rol}</span>
                      <Badge variant={c.completa ? "default" : "secondary"}>
                        {c.completa ? "Lista" : "Aún no"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {miResultado ? (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-slate-50/80 px-4 py-4">
                  <p className="text-xs text-muted-foreground">Puntaje global (1–5)</p>
                  <p className="text-3xl font-bold tracking-tight">{miResultado.puntajeGlobal}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No es el promedio simple: cada rol aporta según su peso.
                  </p>
                </div>

                {contribuciones.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cómo se calcula tu global
                    </p>
                    <div className="overflow-hidden rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Mirada</th>
                            <th className="px-3 py-2 font-medium">Promedio</th>
                            <th className="px-3 py-2 font-medium">Peso</th>
                            <th className="px-3 py-2 font-medium">Aporte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contribuciones.map((c) => (
                            <tr key={c.rol} className="border-t">
                              <td className="px-3 py-2">
                                {ROL_RECIBIDO_LABEL[c.rol] ?? c.rol}
                              </td>
                              <td className="px-3 py-2">{c.promedio}</td>
                              <td className="px-3 py-2">{c.pesoEfectivoPct}%</td>
                              <td className="px-3 py-2 font-medium">{c.aporte}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-slate-50/80">
                            <td className="px-3 py-2 font-medium" colSpan={3}>
                              Global
                            </td>
                            <td className="px-3 py-2 font-bold">{miResultado.puntajeGlobal}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Por competencia
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Promedio simple de las notas recibidas en cada competencia.
                  </p>
                  <div className="space-y-2">
                    {miResultado.porCompetencia.map((c) => (
                      <div
                        key={c.competencia}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{c.competencia}</span>
                        <span className="font-medium">{c.puntaje || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay notas hacia vos. Completá tu autoevaluación y esperá la del gerente:
                después vas a ver el global y el desglose acá.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrar ciclos</CardTitle>
            <CardDescription>
              Abrí un ciclo para que el equipo complete autoevaluaciones y evaluaciones de
              jefatura.
            </CardDescription>
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
              Resultados del equipo
            </CardTitle>
            <CardDescription>
              Puntaje global ponderado por empleado. No impacta el premio.
            </CardDescription>
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
              {evaluando?.rol === "AUTOEVALUACION"
                ? "Tu autoevaluación"
                : `Evaluar a ${evaluando?.evaluadoNombre}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={enviarEvaluacion} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {evaluando && (ROL_HINT[evaluando.rol] ?? ROL_LABEL[evaluando.rol])}
            </p>
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Escala: {ESCALA.map((e) => `${e.n} ${e.label}`).join(" · ")}
            </div>
            {evaluando?.competencias.map((comp) => (
              <div key={comp} className="space-y-2">
                <Label>{comp}</Label>
                <div className="flex flex-wrap gap-2">
                  {ESCALA.map(({ n, label }) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={scores[comp] === n ? "default" : "outline"}
                      onClick={() => setScores({ ...scores, [comp]: n })}
                      title={label}
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
