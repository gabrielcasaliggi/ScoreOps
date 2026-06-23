"use client";

import { useRef } from "react";
import * as XLSX from "xlsx";

export async function readImportFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("El archivo Excel no tiene hojas");
    return XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n" });
  }

  if (
    name.endsWith(".csv") ||
    name.endsWith(".txt") ||
    file.type.startsWith("text/") ||
    file.type === "application/vnd.ms-excel"
  ) {
    return file.text();
  }

  throw new Error("Formato no soportado. Usá CSV, TXT o Excel (.xlsx)");
}

export function useImportFileReader(
  onContent: (content: string, fileName: string) => void,
  onError: (message: string) => void
) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const content = await readImportFile(file);
      if (!content.trim()) {
        onError("El archivo está vacío");
        return;
      }
      onContent(content, file.name);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo leer el archivo");
    }
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  return { inputRef, handleFileChange, openFilePicker };
}
