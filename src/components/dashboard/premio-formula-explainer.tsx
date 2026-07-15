import { Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PREMIO_FORMULA_STEPS } from "@/lib/premio-formula";
import { cn } from "@/lib/utils";

const BLOQUES_VISUALES = [
  { id: "a", label: "Base", pct: 30, hint: "Individual · 6+ meses" },
  { id: "b", label: "Asistencia", pct: 5, hint: "Individual" },
  { id: "c", label: "Reparaciones", pct: 5, hint: "Equipo" },
  { id: "d", label: "Pulsos", pct: 5, hint: "Equipo" },
  { id: "e", label: "Cobranzas", pct: 5, hint: "Equipo" },
] as const;

export function PremioFormulaExplainer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Premio = hasta 50% del sueldo:</span>{" "}
        30% base (si tenés 6+ meses) + 5% por buena asistencia + 5% × 3 metas de equipo
        (reparaciones, pulsos, cobranzas). S1 se paga en septiembre; S2 en marzo.
      </p>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-base font-bold tracking-tight">
          <Calculator className="h-4 w-4 text-slate-700" />
          Cómo se calcula (en simple)
        </CardTitle>
        <CardDescription>
          Cada bloque suma un % del sueldo de referencia. Si un bloque no se cumple, ese 5% (o el
          30% base) no entra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex h-10 w-full">
            {BLOQUES_VISUALES.map((b, i) => (
              <div
                key={b.id}
                className={cn(
                  "flex items-center justify-center text-[10px] font-bold text-white sm:text-xs",
                  i === 0 ? "bg-slate-800" : i === 1 ? "bg-blue-700" : "bg-slate-500"
                )}
                style={{ flexGrow: b.pct, flexBasis: 0 }}
                title={`${b.label}: ${b.pct}%`}
              >
                <span className="hidden px-1 truncate sm:inline">
                  {b.label} {b.pct}%
                </span>
                <span className="sm:hidden">{b.pct}%</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 divide-x border-t bg-slate-50 text-center text-[10px] text-slate-600">
            {BLOQUES_VISUALES.map((b) => (
              <div key={b.id} className="px-1 py-2">
                <p className="font-semibold text-slate-800">{b.id})</p>
                <p className="mt-0.5 hidden sm:block">{b.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {PREMIO_FORMULA_STEPS.map((step) => (
            <div key={step.titulo} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <p className="font-semibold text-slate-900">{step.titulo}</p>
              <p className="mt-0.5 text-muted-foreground">{step.texto}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-blue-50/60 px-4 py-3 text-xs text-slate-800">
          <strong>Ejemplo fácil:</strong> persona con 6+ meses, asistencia ok y las 3 metas de
          equipo cumplidas → <strong>50%</strong> del sueldo (30 + 5 + 5 + 5 + 5).
        </div>
      </CardContent>
    </Card>
  );
}
