import { CheckCircle2, Target, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PASOS = [
  {
    icon: Target,
    titulo: "1. Cómo se arma el premio",
    texto: "Hasta 50%: 30% fijo (antigüedad) + 5% asistencia + 15% metas de equipo.",
  },
  {
    icon: Users,
    titulo: "2. Metas del equipo",
    texto: "Reclamos 95%, ventas 100% y cobranzas 80% — 5% cada una si se cumplen.",
  },
  {
    icon: CheckCircle2,
    titulo: "3. Quién cobraría hoy",
    texto: "Ranking y a quién acompañar antes del cierre (pago en abril u octubre).",
  },
] as const;

export function PremioGuiaRapida() {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
        {PASOS.map((paso) => {
          const Icon = paso.icon;
          return (
            <div key={paso.titulo} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-900">{paso.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{paso.texto}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
