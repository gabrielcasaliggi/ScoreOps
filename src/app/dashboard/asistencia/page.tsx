"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Download, FileUp, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ASISTENCIA_CSV_TEMPLATE } from "@/lib/csv-utils";
import { RELOJ_CSV_TEMPLATE } from "@/lib/asistencia-import";
import { useImportFileReader } from "@/lib/import-file-reader";
import { PageHeader } from "@/components/layout/page-header";

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
}

interface Registro {
  id: string;
  fecha: string;
  tipo: string;
  minutosTarde: number | null;
  observacion: string | null;
  user: { nombre: string; apellido: string; legajo: string | null };
}

const TIPOS = [
  "PRESENTE",
  "IMPUNTUALIDAD",
  "INASISTENCIA_INJUSTIFICADA",
  "VACACIONES",
  "LICENCIA_EXAMEN",
  "LICENCIA_MUDANZA",
  "LICENCIA_GREMIAL",
  "CARPETA_MEDICA_JUSTIFICADA",
  "ACCIDENTE_TRABAJO",
  "SANCION_DISCIPLINARIA",
  "SUSPENSION_DISCIPLINARIA",
];

type ImportFormato = "reloj" | "completo";

export default function AsistenciaPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [periodo, setPeriodo] = useState("actual");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importFormato, setImportFormato] = useState<ImportFormato>("reloj");
  const [importResult, setImportResult] = useState<{
    filasOk: number;
    filasError: number;
    errores: { fila: number; motivo: string }[];
  } | null>(null);
  const [form, setForm] = useState({
    userId: "",
    fecha: "",
    tipo: "PRESENTE",
    minutosTarde: "",
    observacion: "",
  });
  const [error, setError] = useState("");

  const { inputRef, handleFileChange, openFilePicker } = useImportFileReader(
    (content, fileName) => {
      setCsvContent(content);
      setImportFileName(fileName);
      setImportResult(null);
      setError("");
    },
    setError
  );

  const load = useCallback(async () => {
    const [asistRes, usrRes] = await Promise.all([
      fetch(`/api/asistencia?periodo=${periodo}`),
      fetch("/api/usuarios?activo=true"),
    ]);
    const asistData = await asistRes.json();
    setRegistros(asistData.registros ?? []);
    setUsuarios(await usrRes.json());
  }, [periodo]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: form.userId,
        fecha: form.fecha,
        tipo: form.tipo,
        minutosTarde: form.minutosTarde ? Number(form.minutosTarde) : undefined,
        observacion: form.observacion || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      return;
    }
    setShowForm(false);
    load();
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setImportResult(null);

    if (!csvContent.trim()) {
      setError("Seleccioná un archivo o pegá el contenido del CSV");
      return;
    }

    const res = await fetch("/api/asistencia", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csv: csvContent,
        archivo: importFileName ?? "asistencia.csv",
        formato: importFormato,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al importar");
      return;
    }
    setImportResult(data);
    load();
  }

  function downloadTemplate() {
    const template =
      importFormato === "reloj" ? RELOJ_CSV_TEMPLATE : ASISTENCIA_CSV_TEMPLATE;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      importFormato === "reloj" ? "plantilla-reloj.csv" : "plantilla-asistencia.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openImportDialog() {
    setError("");
    setImportResult(null);
    setCsvContent("");
    setImportFileName(null);
    setShowImport(true);
  }

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarClock className="h-6 w-6 shrink-0" />
            Asistencia y puntualidad
          </h1>
        }
        description="Registro manual o importación desde archivo del reloj de entrada (CSV / Excel)."
        actions={
          <>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="actual">Semestre actual</option>
              <option value="anterior">Semestre anterior</option>
            </select>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={openImportDialog}
            >
              <Upload className="h-4 w-4" />
              Importar archivo
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros del periodo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Legajo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Min. tarde</th>
                <th className="px-4 py-3">Observación</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{new Date(r.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">
                    {r.user.nombre} {r.user.apellido}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.user.legajo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{r.tipo.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.minutosTarde ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.observacion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {registros.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">Sin registros en este periodo</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar asistencia</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido} ({u.legajo ?? "sin legajo"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            {form.tipo === "IMPUNTUALIDAD" && (
              <div className="space-y-2">
                <Label>Minutos de tardanza</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.minutosTarde}
                  onChange={(e) => setForm({ ...form, minutosTarde: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Observación</Label>
              <Input
                value={form.observacion}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Guardar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar asistencia desde archivo</DialogTitle>
            <DialogDescription>
              Subí el export del reloj de entrada (CSV o Excel). También podés pegar el contenido
              manualmente abajo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Formato del archivo</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={importFormato}
              onChange={(e) => {
                setImportFormato(e.target.value as ImportFormato);
                setCsvContent("");
                setImportFileName(null);
              }}
            >
              <option value="reloj">Reloj de entrada (legajo, fecha, horas o minutos)</option>
              <option value="completo">Completo (legajo, fecha, tipo, minutos_tarde)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {importFormato === "reloj"
                ? "Columnas: legajo + fecha + (hora_entrada + hora_programada) o minutos_tarde. Fechas dd/mm/aaaa o aaaa-mm-dd."
                : "Columnas: legajo, fecha, tipo, minutos_tarde, observacion."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openFilePicker}>
              <FileUp className="h-4 w-4 mr-2" />
              Elegir archivo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Descargar plantilla
            </Button>
          </div>

          {importFileName && (
            <p className="text-sm text-emerald-700 rounded-lg bg-emerald-50 px-3 py-2">
              Archivo cargado: <strong>{importFileName}</strong>
            </p>
          )}

          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <Label>Vista previa / pegar CSV</Label>
              <textarea
                className="w-full h-36 rounded-md border border-input bg-background p-3 text-xs font-mono"
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setImportFileName(null);
                }}
                placeholder="Elegí un archivo arriba o pegá aquí legajo,fecha,hora_entrada,hora_programada..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {importResult && (
              <div className="text-sm rounded-lg bg-muted p-3 space-y-1">
                <p>
                  OK: {importResult.filasOk} · Errores: {importResult.filasError}
                </p>
                {importResult.errores?.slice(0, 8).map((err) => (
                  <p key={`${err.fila}-${err.motivo}`} className="text-destructive text-xs">
                    Fila {err.fila}: {err.motivo}
                  </p>
                ))}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!csvContent.trim()}>
              Importar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
