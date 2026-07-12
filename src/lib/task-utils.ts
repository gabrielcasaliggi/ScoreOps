export interface TareaLimiteStatus {
  vencida: boolean;
  proxima: boolean;
  fechaLabel: string | null;
}

export type TaskStatusKey =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "PENDIENTE_APROBACION"
  | "COMPLETADA";

/** Labels operativos: gerente/admin ven "Por aprobar"; empleado "En revisión". */
export function labelEstadoTarea(estado: string, role?: string | null): string {
  if (estado === "PENDIENTE_APROBACION") {
    return role === "EMPLEADO" ? "En revisión" : "Por aprobar";
  }
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    EN_PROCESO: "En proceso",
    COMPLETADA: "Completada",
  };
  return labels[estado] ?? estado;
}

export function badgeVariantEstadoTarea(
  estado: string
): "secondary" | "warning" | "success" | "outline" {
  if (estado === "COMPLETADA") return "success";
  if (estado === "EN_PROCESO" || estado === "PENDIENTE_APROBACION") return "warning";
  return "secondary";
}

export const ESTADOS_TAREA_FILTRO: TaskStatusKey[] = [
  "PENDIENTE",
  "EN_PROCESO",
  "PENDIENTE_APROBACION",
  "COMPLETADA",
];

export function getTareaLimiteStatus(
  fechaLimite: string | Date | null | undefined,
  estado: string
): TareaLimiteStatus {
  if (!fechaLimite || estado === "COMPLETADA" || estado === "PENDIENTE_APROBACION") {
    return { vencida: false, proxima: false, fechaLabel: null };
  }

  const limite = new Date(fechaLimite);
  if (Number.isNaN(limite.getTime())) {
    return { vencida: false, proxima: false, fechaLabel: null };
  }

  const now = new Date();
  const vencida = limite < now;
  const tresDias = 3 * 24 * 60 * 60 * 1000;
  const proxima = !vencida && limite.getTime() - now.getTime() <= tresDias;

  return {
    vencida,
    proxima,
    fechaLabel: limite.toLocaleDateString("es-AR"),
  };
}

export function countTareasVencidas<
  T extends { fechaLimite?: string | Date | null; estado: string }
>(tareas: T[]): number {
  return tareas.filter((t) => getTareaLimiteStatus(t.fechaLimite, t.estado).vencida).length;
}

export function toFechaLimiteIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T23:59:59`).toISOString();
}
