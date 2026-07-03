"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface OrganizationRow {
  id: string;
  slug: string;
  name: string;
  activo: boolean;
  usuarios: number;
  areas: number;
  createdAt: string;
}

export function SuperAdminPanel() {
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    adminEmail: "",
    adminPassword: "",
    adminNombre: "",
    adminApellido: "",
    areaNombre: "General",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/organizations");
      if (!res.ok) {
        setError("Sin acceso o error al cargar organizaciones.");
        return;
      }
      const data = await res.json();
      setOrgs(data.organizations ?? []);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/superadmin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }

    setMessage(data.loginHint ?? "Organización creada.");
    setShowForm(false);
    setForm({
      slug: "",
      name: "",
      adminEmail: "",
      adminPassword: "",
      adminNombre: "",
      adminApellido: "",
      areaNombre: "General",
    });
    load();
  }

  async function toggleActivo(org: OrganizationRow) {
    await fetch(`/api/superadmin/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !org.activo }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super-admin Vertia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alta y gestión de cooperativas en la plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva cooperativa
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva organización</CardTitle>
            <CardDescription>
              Se crea la org, un área inicial y el usuario administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Slug (login)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, "-") })
                  }
                  placeholder="coop-norte"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre cooperativa</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Área inicial</Label>
                <Input
                  value={form.areaNombre}
                  onChange={(e) => setForm({ ...form, areaNombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email admin</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña admin</Label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre admin</Label>
                <Input
                  value={form.adminNombre}
                  onChange={(e) => setForm({ ...form, adminNombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Apellido admin</Label>
                <Input
                  value={form.adminApellido}
                  onChange={(e) => setForm({ ...form, adminApellido: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creando..." : "Crear organización"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organizaciones ({orgs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay organizaciones.</p>
          ) : (
            <div className="space-y-3">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      slug: <code>{org.slug}</code> · {org.usuarios} usuarios · {org.areas}{" "}
                      áreas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={org.activo ? "default" : "secondary"}>
                      {org.activo ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => toggleActivo(org)}>
                      {org.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
