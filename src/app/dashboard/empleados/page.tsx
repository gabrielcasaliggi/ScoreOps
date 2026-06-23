"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Pencil,
  Plus,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPLEADOS_CSV_TEMPLATE } from "@/lib/csv-utils";
import { PageHeader } from "@/components/layout/page-header";

interface Area {
  id: string;
  nombre: string;
}

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  telefono: string | null;
  sueldoBasico: number | null;
  valorAntiguedad: number | null;
  role: string;
  activo: boolean;
  fechaAlta: string;
  fechaBaja: string | null;
  area: { id: string; nombre: string };
}

const emptyForm = {
  email: "",
  nombre: "",
  apellido: "",
  legajo: "",
  telefono: "",
  sueldoBasico: "",
  valorAntiguedad: "",
  role: "EMPLEADO",
  areaId: "",
  password: "",
};

export default function EmpleadosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [q, setQ] = useState("");
  const [activoFilter, setActivoFilter] = useState<"true" | "false" | "all">("true");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [csvContent, setCsvContent] = useState("");
  const [importResult, setImportResult] = useState<{
    filasOk: number;
    filasError: number;
    errores: { fila: number; motivo: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setAuthorized(data.user?.role === "ADMINISTRADOR"));
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ activo: activoFilter });
    if (q) params.set("q", q);
    const [usrRes, areaRes] = await Promise.all([
      fetch(`/api/usuarios?${params}`),
      fetch("/api/areas"),
    ]);
    setUsuarios(await usrRes.json());
    setAreas(await areaRes.json());
    setLoading(false);
  }, [activoFilter, q]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, areaId: areas[0]?.id ?? "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(u: Usuario) {
    setEditing(u);
    setForm({
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      legajo: u.legajo ?? "",
      telefono: u.telefono ?? "",
      sueldoBasico: u.sueldoBasico != null ? String(u.sueldoBasico) : "",
      valorAntiguedad: u.valorAntiguedad != null ? String(u.valorAntiguedad) : "",
      role: u.role,
      areaId: u.area.id,
      password: "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const url = editing ? `/api/usuarios/${editing.id}` : "/api/usuarios";
    const method = editing ? "PATCH" : "POST";
    const body = editing
      ? {
          email: form.email,
          nombre: form.nombre,
          apellido: form.apellido,
          legajo: form.legajo || null,
          telefono: form.telefono || null,
          role: form.role,
          areaId: form.areaId,
          sueldoBasico: form.sueldoBasico ? Number(form.sueldoBasico) : null,
          valorAntiguedad: form.valorAntiguedad ? Number(form.valorAntiguedad) : null,
          ...(form.password ? { password: form.password } : {}),
        }
      : form;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      return;
    }

    setShowForm(false);
    load();
  }

  async function handleBaja(id: string, nombre: string) {
    if (!confirm(`¿Dar de baja a ${nombre}?`)) return;
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    load();
  }

  async function handleReactivar(id: string) {
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    });
    load();
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setImportResult(null);

    const res = await fetch("/api/usuarios/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvContent, archivo: "empleados.csv" }),
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
    const blob = new Blob([EMPLEADOS_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-empleados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authorized === null) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!authorized) {
    return <p className="text-destructive">Acceso restringido a administradores.</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando empleados...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 shrink-0" />
            Gestión de empleados
          </h1>
        }
        description="Altas, bajas, modificaciones e importación masiva"
        actions={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowImport(true)}
            >
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              Nuevo empleado
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nombre, email o legajo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={activoFilter}
            onChange={(e) => setActivoFilter(e.target.value as typeof activoFilter)}
          >
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border bg-white/80">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Legajo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{u.legajo ?? "—"}</td>
                <td className="px-4 py-3">
                  {u.nombre} {u.apellido}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{u.area.nombre}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{u.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.activo ? "success" : "secondary"}>
                    {u.activo ? "Activo" : "Baja"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {u.activo ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleBaja(u.id, `${u.nombre} ${u.apellido}`)}
                      >
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleReactivar(u.id)}>
                        Reactivar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No hay empleados</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modificá los datos del usuario" : "Completá los datos para el alta"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={form.apellido}
                  onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Legajo</Label>
                <Input
                  value={form.legajo}
                  onChange={(e) => setForm({ ...form, legajo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
            </div>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sueldo básico ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.sueldoBasico}
                    onChange={(e) => setForm({ ...form, sueldoBasico: e.target.value })}
                    placeholder="Para cálculo Art. 49"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor antigüedad ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.valorAntiguedad}
                    onChange={(e) => setForm({ ...form, valorAntiguedad: e.target.value })}
                    placeholder="Sueldo ref. = básico + antigüedad"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Área</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.areaId}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                  required
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="EMPLEADO">EMPLEADO</option>
                  <option value="GERENTE">GERENTE</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{editing ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
                minLength={6}
                placeholder={editing ? "Dejar vacío para no cambiar" : "password123"}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {editing ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar empleados desde CSV</DialogTitle>
            <DialogDescription>
              Columnas: legajo, email, nombre, apellido, area, role, password
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla
          </Button>
          <form onSubmit={handleImport} className="space-y-4">
            <textarea
              className="w-full h-40 rounded-md border border-input bg-background p-3 text-xs font-mono"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Pegá el contenido del CSV aquí..."
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {importResult && (
              <div className="text-sm rounded-lg bg-muted p-3">
                <p>
                  OK: {importResult.filasOk} · Errores: {importResult.filasError}
                </p>
                {importResult.errores?.slice(0, 5).map((err) => (
                  <p key={err.fila} className="text-destructive text-xs">
                    Fila {err.fila}: {err.motivo}
                  </p>
                ))}
              </div>
            )}
            <Button type="submit" className="w-full">
              Importar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
