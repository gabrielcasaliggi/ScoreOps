export interface CsvParseResult<T> {
  rows: T[];
  errors: { fila: number; motivo: string }[];
}

export function parseCsvContent(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));
  return { headers, rows };
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: "," | ";" = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, i) => {
    record[header] = row[i]?.trim() ?? "";
  });
  return record;
}

export const EMPLEADOS_CSV_TEMPLATE =
  "legajo,email,nombre,apellido,area,role,password\n" +
  "1001,nuevo@vertia.local,Juan,Pérez,Operaciones,EMPLEADO,password123\n";

export const ASISTENCIA_CSV_TEMPLATE =
  "legajo,fecha,tipo,minutos_tarde,observacion\n" +
  "1001,2026-04-15,IMPUNTUALIDAD,20,Llegada tarde\n" +
  "1001,2026-04-16,INASISTENCIA_INJUSTIFICADA,,Sin aviso\n";
