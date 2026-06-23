import type { AsistenciaTipo } from "@prisma/client";

export type AsistenciaImportFormato = "completo" | "reloj";

export interface AsistenciaImportRow {
  fila: number;
  legajo: string;
  fecha: Date;
  tipo: AsistenciaTipo;
  minutosTarde?: number;
  observacion?: string;
}

export interface AsistenciaImportError {
  fila: number;
  motivo: string;
}

const HEADER_ALIASES: Record<string, string> = {
  legajo: "legajo",
  nro_legajo: "legajo",
  numero_legajo: "legajo",
  id_empleado: "legajo",
  empleado: "legajo",
  fecha: "fecha",
  date: "fecha",
  dia: "fecha",
  tipo: "tipo",
  minutos_tarde: "minutos_tarde",
  minutos: "minutos_tarde",
  tardanza: "minutos_tarde",
  minutos_retardo: "minutos_tarde",
  retardo: "minutos_tarde",
  hora_entrada: "hora_entrada",
  hora_marcacion: "hora_entrada",
  marcacion: "hora_entrada",
  entrada: "hora_entrada",
  hora_ingreso: "hora_entrada",
  hora_programada: "hora_programada",
  hora_esperada: "hora_programada",
  hora_teorica: "hora_programada",
  horario: "hora_programada",
  observacion: "observacion",
  obs: "observacion",
  comentario: "observacion",
};

export function normalizeHeader(header: string): string {
  const key = header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return HEADER_ALIASES[key] ?? key;
}

export function parseFechaFlexible(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const ar = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ar) {
    const day = ar[1].padStart(2, "0");
    const month = ar[2].padStart(2, "0");
    const d = new Date(`${ar[3]}-${month}-${day}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTimeToMinutes(time: string): number | null {
  const v = time.trim();
  const m = v.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function calcularMinutosTarde(entrada: string, programada: string): number | null {
  const e = parseTimeToMinutes(entrada);
  const p = parseTimeToMinutes(programada);
  if (e === null || p === null) return null;
  return Math.max(0, e - p);
}

function mapTipoFromMinutos(minutos: number): AsistenciaTipo {
  return minutos > 0 ? "IMPUNTUALIDAD" : "PRESENTE";
}

export function parseAsistenciaImportRows(input: {
  headers: string[];
  rows: string[][];
  formato: AsistenciaImportFormato;
  parseTipo: (value: string) => AsistenciaTipo | null;
}): { rows: AsistenciaImportRow[]; errores: AsistenciaImportError[] } {
  const normalizedHeaders = input.headers.map(normalizeHeader);
  const rows: AsistenciaImportRow[] = [];
  const errores: AsistenciaImportError[] = [];

  for (let i = 0; i < input.rows.length; i++) {
    const fila = i + 2;
    const raw: Record<string, string> = {};
    normalizedHeaders.forEach((header, idx) => {
      raw[header] = input.rows[i][idx]?.trim() ?? "";
    });

    const legajo = raw.legajo;
    if (!legajo) {
      errores.push({ fila, motivo: "Legajo vacío" });
      continue;
    }

    const fecha = parseFechaFlexible(raw.fecha);
    if (!fecha) {
      errores.push({ fila, motivo: `Fecha inválida: ${raw.fecha || "(vacía)"}` });
      continue;
    }

    if (input.formato === "reloj") {
      let minutos: number | null = null;

      if (raw.minutos_tarde) {
        minutos = Number(raw.minutos_tarde.replace(",", "."));
        if (Number.isNaN(minutos)) {
          errores.push({ fila, motivo: "Minutos de tardanza inválidos" });
          continue;
        }
      } else if (raw.hora_entrada && raw.hora_programada) {
        minutos = calcularMinutosTarde(raw.hora_entrada, raw.hora_programada);
        if (minutos === null) {
          errores.push({
            fila,
            motivo: `Horas inválidas: ${raw.hora_entrada} / ${raw.hora_programada}`,
          });
          continue;
        }
      } else {
        errores.push({
          fila,
          motivo: "Faltan minutos_tarde o hora_entrada + hora_programada",
        });
        continue;
      }

      rows.push({
        fila,
        legajo,
        fecha,
        tipo: mapTipoFromMinutos(minutos),
        minutosTarde: minutos > 0 ? Math.round(minutos) : undefined,
        observacion: raw.observacion || "Importado desde reloj",
      });
      continue;
    }

    const tipo = input.parseTipo(raw.tipo);
    if (!tipo) {
      errores.push({ fila, motivo: `Tipo inválido: ${raw.tipo}` });
      continue;
    }

    let minutosTarde: number | undefined;
    if (raw.minutos_tarde) {
      const min = Number(raw.minutos_tarde.replace(",", "."));
      if (Number.isNaN(min)) {
        errores.push({ fila, motivo: "minutos_tarde inválido" });
        continue;
      }
      minutosTarde = Math.round(min);
    }

    rows.push({
      fila,
      legajo,
      fecha,
      tipo,
      minutosTarde,
      observacion: raw.observacion || undefined,
    });
  }

  return { rows, errores };
}

export const RELOJ_CSV_TEMPLATE =
  "legajo,fecha,hora_entrada,hora_programada,observacion\n" +
  "001,15/04/2026,08:07,08:00,Marcación reloj\n" +
  "001,16/04/2026,08:02,08:00,\n" +
  "002,15/04/2026,08:00,08:00,Puntual\n";

export const RELOJ_CSV_TEMPLATE_MINUTOS =
  "legajo,fecha,minutos_tarde,observacion\n" +
  "001,15/04/2026,7,Marcación reloj\n" +
  "001,16/04/2026,2,\n";
