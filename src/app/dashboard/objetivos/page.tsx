"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/utils";

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
}

interface KPI {
  id: string;
  nombre: string;
  valorMeta: number;
  valorActual: number;
  unidad: string;
}

interface Objetivo {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  userId: string;
  user: Usuario;
  kpis: KPI[];
  _count: { tareas: number };
}

const emptyObjetivo = {
  titulo: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  userId: "",
};

const emptyKpi = {
  nombre: "",
  valorMeta: "",
  valorActual: "0",
  unidad: "",
};

export default function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showObjetivo, setShowObjetivo] = useState(false);
  const [showKpi, setShowKpi] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyObjetivo);
  const [kpiForm, setKpiForm] = useState(emptyKpi);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [objRes, usrRes] = await Promise.all([
      fetch("/api/objetivos"),
      fetch("/api/usuarios"),
    ]);
    setObjetivos(await objRes.json());
    setUsuarios(await usrRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyObjetivo);
    setError("");
    setShowObjetivo(true);
  }

  function openEdit(obj: Objetivo) {
    setEditingId(obj.id);
    setForm({
      titulo: obj.titulo,
      descripcion: obj.descripcion ?? "",
      fechaInicio: obj.fechaInicio.split("T")[0],
      fechaFin: obj.fechaFin.split("T")[0],
      userId: obj.userId,
    });
    setError("");
    setShowObjetivo(true);
  }

  async function saveObjetivo() {
    setError("");
    const payload = {
      ...form,
      fechaInicio: new Date(form.fechaInicio).toISOString(),
      fechaFin: new Date(form.fechaFin).toISOString(),
    };

    const url = editingId ? `/api/objetivos/${editingId}` : "/api/objetivos";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      return;
    }

    setShowObjetivo(false);
    load();
  }

  async function deleteObjetivo(id: string) {
    if (!confirm("¿Eliminar este objetivo y sus KPIs?")) return;
    await fetch(`/api/objetivos/${id}`, { method: "DELETE" });
    load();
  }

  async function saveKpi(objetivoId: string) {
    const res = await fetch("/api/kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objetivoId,
        nombre: kpiForm.nombre,
        valorMeta: Number(kpiForm.valorMeta),
        valorActual: Number(kpiForm.valorActual),
        unidad: kpiForm.unidad,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear KPI");
      return;
    }

    setShowKpi(null);
    setKpiForm(emptyKpi);
    load();
  }

  async function updateKpiValor(kpiId: string, valorActual: number) {
    await fetch(`/api/kpis/${kpiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valorActual }),
    });
    load();
  }

  async function deleteKpi(id: string) {
    if (!confirm("¿Eliminar este KPI?")) return;
    await fetch(`/api/kpis/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<h1 className="text-2xl font-bold tracking-tight">Objetivos y KPIs</h1>}
        description="Metas semestrales por persona, indicadores de avance y vínculo con tareas"
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo objetivo
          </Button>
        }
      />

      <div className="space-y-4">
        {objetivos.length === 0 && (
          <EmptyState
            icon={Target}
            title="Todavía no hay objetivos"
            description="Creá el primero para asignar KPIs y vincular tareas del semestre."
            action={
              <Button onClick={openCreate} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo objetivo
              </Button>
            }
          />
        )}

        {objetivos.map((obj) => {
          const diasRestantes = Math.ceil(
            (new Date(obj.fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          return (
            <Card key={obj.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <CardTitle className="text-lg">{obj.titulo}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {obj.user.nombre} {obj.user.apellido} ·{" "}
                        {new Date(obj.fechaInicio).toLocaleDateString("es-ES")} —{" "}
                        {new Date(obj.fechaFin).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={diasRestantes < 7 ? "warning" : "secondary"}>
                      {diasRestantes > 0 ? `${diasRestantes} días` : "Vencido"}
                    </Badge>
                    <Badge variant="outline">{obj._count.tareas} tareas</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(obj)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteObjetivo(obj.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {obj.descripcion && (
                  <p className="text-sm text-muted-foreground">{obj.descripcion}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">KPIs ({obj.kpis.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setKpiForm(emptyKpi);
                        setError("");
                        setShowKpi(obj.id);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Añadir KPI
                    </Button>
                  </div>

                  {obj.kpis.map((kpi) => {
                    const pct = kpi.valorMeta > 0
                      ? Math.min((kpi.valorActual / kpi.valorMeta) * 100, 100)
                      : 0;
                    return (
                      <div key={kpi.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{kpi.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {kpi.valorActual} / {kpi.valorMeta} {kpi.unidad}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteKpi(kpi.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{formatPercent(pct)}</span>
                          <Input
                            type="number"
                            className="h-7 w-24 text-xs ml-auto"
                            defaultValue={kpi.valorActual}
                            onBlur={(e) =>
                              updateKpiValor(kpi.id, Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showObjetivo} onOpenChange={setShowObjetivo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar objetivo" : "Nuevo objetivo"}</DialogTitle>
            <DialogDescription>
              Asigna una meta con rango de fechas a un empleado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">Seleccionar empleado</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={saveObjetivo} className="w-full">
              {editingId ? "Guardar cambios" : "Crear objetivo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showKpi} onOpenChange={() => setShowKpi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo KPI</DialogTitle>
            <DialogDescription>Indicador cuantitativo de éxito</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={kpiForm.nombre}
                onChange={(e) => setKpiForm({ ...kpiForm, nombre: e.target.value })}
                placeholder="Ej: Trámites procesados"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor meta</Label>
                <Input
                  type="number"
                  value={kpiForm.valorMeta}
                  onChange={(e) => setKpiForm({ ...kpiForm, valorMeta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor actual</Label>
                <Input
                  type="number"
                  value={kpiForm.valorActual}
                  onChange={(e) => setKpiForm({ ...kpiForm, valorActual: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={kpiForm.unidad}
                onChange={(e) => setKpiForm({ ...kpiForm, unidad: e.target.value })}
                placeholder="Ej: Trámites, Horas, %"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => showKpi && saveKpi(showKpi)} className="w-full">
              Crear KPI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
