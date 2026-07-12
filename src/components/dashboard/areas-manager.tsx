"use client";

import { useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AreaRow {
  id: string;
  nombre: string;
  usuarios?: number;
}

interface AreasManagerProps {
  areas: AreaRow[];
  onChanged: () => void;
}

export function AreasManager({ areas, onChanged }: AreasManagerProps) {
  const [nombre, setNombre] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el área");
        return;
      }
      setNombre("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: string) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nombre: editNombre }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo renombrar");
        return;
      }
      setEditingId(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`¿Eliminar el área "${label}"? Solo si no tiene usuarios.`)) return;
    setError("");
    const res = await fetch(`/api/areas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    onChanged();
  }

  return (
    <Card className="dash-panel border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-teal-700" />
          Áreas de la empresa
        </CardTitle>
        <CardDescription>
          Definí sectores/departamentos antes de cargar empleados. El administrador puede crear
          todas las que necesite.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <ul className="space-y-2">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/80"
            >
              {editingId === a.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="max-w-xs"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="rounded-lg"
                    disabled={saving || !editNombre.trim()}
                    onClick={() => handleRename(a.id)}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.nombre}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {a.usuarios ?? 0} usuario{(a.usuarios ?? 0) === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(a.id);
                        setEditNombre(a.nombre);
                      }}
                      title="Renombrar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(a.id, a.nombre)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
          {areas.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Todavía no hay áreas.</p>
          )}
        </ul>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label htmlFor="nueva-area">Nueva área</Label>
            <Input
              id="nueva-area"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Logística, Sistemas…"
              required
            />
          </div>
          <Button type="submit" className="rounded-xl" disabled={saving || !nombre.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar área
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
