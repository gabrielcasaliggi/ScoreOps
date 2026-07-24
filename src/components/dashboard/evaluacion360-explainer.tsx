"use client";

import { ChevronDown, HelpCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Pesos360 {
  autoevaluacion: number;
  gerente: number;
  par: number;
  subordinado: number;
}

function pct(peso: number) {
  return `${Math.round(peso * 100)}%`;
}

/** Explica para qué sirve la 360 y cómo se arma el puntaje. */
export function Evaluacion360Explainer({
  pesos,
  variant = "employee",
}: {
  pesos?: Pesos360 | null;
  variant?: "employee" | "manager";
}) {
  const p = pesos ?? {
    autoevaluacion: 0.1,
    gerente: 0.4,
    par: 0.3,
    subordinado: 0.2,
  };

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white/70 open:pb-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
          <div>
            <p className="font-semibold text-slate-900">¿Qué es esto y cómo se calcula?</p>
            <p className="text-sm text-muted-foreground">
              Feedback de competencias · no impacta el premio
            </p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-slate-100 px-5 py-4 text-sm">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-muted-foreground">
          <p className="font-medium text-slate-800">Para qué sirve</p>
          <p className="mt-1">
            Medir competencias (comunicación, calidad, proactividad, etc.) con más de una mirada.
            {variant === "employee"
              ? " Vos te autoevaluás; tu gerente también te evalúa. El resultado es feedback de desarrollo."
              : " El equipo y los jefes aportan notas; el puntaje global resume el ciclo."}
          </p>
          <p className="mt-2 flex items-start gap-2 text-slate-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>No forma parte del premio semestral.</strong> El premio se calcula con KPIs,
              tareas y asistencia.
            </span>
          </p>
        </div>

        <div>
          <p className="font-medium text-slate-800">Cómo se arma el puntaje global</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Cada rol que respondió tiene un promedio (escala 1–5).</li>
            <li>Esos promedios se combinan con pesos. Si falta un rol, se reequilibran los que sí hay.</li>
            <li>Ejemplo: solo auto + gerente → la auto vale menos que la del jefe, no 50/50.</li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-medium text-slate-800">Pesos configurados</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Autoevaluación {pct(p.autoevaluacion)}</Badge>
            <Badge variant="outline">Gerente {pct(p.gerente)}</Badge>
            <Badge variant="outline">Par {pct(p.par)}</Badge>
            <Badge variant="outline">Subordinado {pct(p.subordinado)}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Si hoy solo hay autoevaluación y gerente, en la práctica pesan{" "}
            {pct(p.autoevaluacion / (p.autoevaluacion + p.gerente))} y{" "}
            {pct(p.gerente / (p.autoevaluacion + p.gerente))} respectivamente.
          </p>
        </div>
      </div>
    </details>
  );
}
