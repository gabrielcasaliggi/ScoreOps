import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PREMIO_FORMULA_STEPS } from "@/lib/premio-formula";

export function PremioFormulaExplainer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">Premio Art. 49 = </span>
        hasta 50% del sueldo básico + antigüedad: 30% base + 5% asistencia + 5% reparaciones +
        5% pulsos + 5% cobranzas. Los tramos b–e requieren cumplir condiciones individuales y
        colectivas.
      </p>
    );
  }

  return (
    <Card className="glass-card border-violet-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-violet-600" />
          ¿Cómo se calcula el premio semestral?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {PREMIO_FORMULA_STEPS.map((step) => (
          <div key={step.titulo}>
            <p className="font-medium text-violet-900">{step.titulo}</p>
            <p className="text-muted-foreground mt-0.5">{step.texto}</p>
          </div>
        ))}
        <div className="rounded-xl bg-violet-50/80 border border-violet-100 px-4 py-3 text-xs text-violet-900">
          Ejemplo: empleado con 6+ meses, asistencia perfecta y metas colectivas cumplidas →{" "}
          <strong>50%</strong> del sueldo de referencia (30 + 5 + 5 + 5 + 5).
        </div>
      </CardContent>
    </Card>
  );
}
