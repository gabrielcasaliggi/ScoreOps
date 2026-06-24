import { AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTareaLimiteStatus } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

export function TareaFechaLimiteBadge({
  fechaLimite,
  estado,
  className,
}: {
  fechaLimite?: string | Date | null;
  estado: string;
  className?: string;
}) {
  const limite = getTareaLimiteStatus(fechaLimite, estado);
  if (!limite.fechaLabel) return null;

  return (
    <Badge
      variant={limite.vencida ? "destructive" : limite.proxima ? "warning" : "outline"}
      className={cn("text-[10px] gap-1", className)}
    >
      {limite.vencida ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Calendar className="h-3 w-3" />
      )}
      {limite.vencida ? "Vencida" : limite.proxima ? "Vence pronto" : "Límite"}{" "}
      {limite.fechaLabel}
    </Badge>
  );
}

export function tareaCardLimiteClass(
  fechaLimite: string | Date | null | undefined,
  estado: string
): string {
  const limite = getTareaLimiteStatus(fechaLimite, estado);
  if (limite.vencida) return "border-destructive/60 bg-destructive/5 ring-1 ring-destructive/20";
  if (limite.proxima) return "border-amber-300/80 bg-amber-50/40";
  return "";
}
