export interface TareaLimiteStatus {
  vencida: boolean;
  proxima: boolean;
  fechaLabel: string | null;
}

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
