import { CheckCircle2, Circle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PremioArt49 } from "@/lib/art49-types";
import { formatMontoPremio } from "@/lib/premio-formula";
import { cn } from "@/lib/utils";

export function PremioArt49Breakdown({
  art49,
  compact = false,
}: {
  art49: PremioArt49;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {art49.tramos.map((t) => (
          <Badge
            key={t.id}
            variant={t.activo ? "default" : "secondary"}
            className={cn(
              "text-[10px] font-mono",
              t.activo && "bg-violet-600 hover:bg-violet-600"
            )}
          >
            {t.id}) {t.porcentajeSueldo}%
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Card className="glass-card border-violet-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span>Premio Art. 49 — {art49.porcentajeTotal}% del sueldo</span>
          {art49.sueldoReferencia > 0 && (
            <span className="text-sm font-semibold text-violet-700">
              {formatMontoPremio(art49)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!art49.elegible && (
          <p className="text-sm text-destructive">{art49.motivoInelegible}</p>
        )}
        {art49.tramos.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm",
              t.activo ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/40"
            )}
          >
            {t.activo ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-violet-800">{t.id})</span>
                <span className="font-medium">{t.nombre}</span>
                <Badge variant="outline" className="text-[10px]">
                  {t.alcance === "colectivo" ? (
                    <>
                      <Users className="h-3 w-3 mr-1" />
                      Colectivo
                    </>
                  ) : (
                    "Individual"
                  )}
                </Badge>
                <span className="ml-auto font-semibold tabular-nums">{t.porcentajeSueldo}%</span>
              </div>
              {!t.activo && t.motivo && (
                <p className="mt-1 text-xs text-muted-foreground">{t.motivo}</p>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Antigüedad: {art49.antiguedadMeses} meses · Impuntualidades leves:{" "}
          {art49.impuntualidadesLeves} · Faltas injustificadas:{" "}
          {art49.inasistenciasInjustificadas}
        </p>
      </CardContent>
    </Card>
  );
}
