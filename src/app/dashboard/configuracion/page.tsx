"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetasColectivasPanel } from "@/components/dashboard/metas-colectivas-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface PremioConfig {
  antiguedadMinimaMeses: number;
  tramoA: number;
  tramoB: number;
  tramoC: number;
  tramoD: number;
  tramoE: number;
  impuntualidadMaxMinutos: number;
  impuntualidadMaxCantidad: number;
  metaReparaciones: number;
  metaPulsos: number;
  metaCobranzas: number;
}

interface PlantillaPremio {
  id: string;
  nombre: string;
  descripcion: string;
}

interface KpiSimpleConfig {
  umbralMinimo: number;
  porcentajeMaximo: number;
}

export default function ConfiguracionPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [resetUserId, setResetUserId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [premioConfig, setPremioConfig] = useState<PremioConfig | null>(null);
  const [premioLoading, setPremioLoading] = useState(false);
  const [premioTemplate, setPremioTemplate] = useState("art49_cooperativo");
  const [plantillas, setPlantillas] = useState<PlantillaPremio[]>([]);
  const [kpiSimpleConfig, setKpiSimpleConfig] = useState<KpiSimpleConfig | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [orgBranding, setOrgBranding] = useState({
    name: "",
    tagline: "",
    logoUrl: "",
    primaryColor: "#2563eb",
  });
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.user?.role ?? null);
        if (data.user?.role === "ADMINISTRADOR" || data.user?.role === "GERENTE") {
          fetch("/api/usuarios")
            .then((r) => r.json())
            .then(setUsuarios);
        }
        if (data.user?.role === "ADMINISTRADOR") {
          fetch("/api/admin/config")
            .then((r) => r.json())
            .then((cfg) => {
              setPremioConfig(cfg.art49);
              setPremioTemplate(cfg.premioTemplate ?? "art49_cooperativo");
              setKpiSimpleConfig(cfg.kpiSimple ?? null);
              setPlantillas(cfg.plantillas ?? []);
            });
          fetch("/api/organization")
            .then((r) => r.json())
            .then((org) => {
              if (org.name) {
                setOrgBranding({
                  name: org.name ?? "",
                  tagline: org.tagline ?? "",
                  logoUrl: org.logoUrl ?? "",
                  primaryColor: org.primaryColor ?? "#2563eb",
                });
              }
            });
        }
      });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al cambiar contraseña");
        return;
      }

      setMessage("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al restablecer");
      return;
    }

    setMessage("Contraseña del empleado restablecida.");
    setResetPassword("");
  }

  async function handlePremioConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!premioConfig) return;
    setPremioLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ art49: premioConfig }),
    });
    const data = await res.json();
    setPremioLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar configuración");
      return;
    }
    setPremioConfig(data.art49);
    setMessage("Configuración Art. 49 actualizada");
  }

  async function handlePremioTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        premioTemplate,
        ...(premioTemplate === "kpi_simple" && kpiSimpleConfig ? { kpiSimple: kpiSimpleConfig } : {}),
      }),
    });
    const data = await res.json();
    setTemplateLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar plantilla");
      return;
    }
    setPremioTemplate(data.premioTemplate);
    setKpiSimpleConfig(data.kpiSimple);
    setMessage("Plantilla de premio actualizada");
  }

  async function handleOrgBranding(e: React.FormEvent) {
    e.preventDefault();
    setOrgLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgBranding.name,
        tagline: orgBranding.tagline || null,
        logoUrl: orgBranding.logoUrl || null,
        primaryColor: orgBranding.primaryColor || null,
      }),
    });
    const data = await res.json();
    setOrgLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar branding");
      return;
    }
    setOrgBranding({
      name: data.name ?? "",
      tagline: data.tagline ?? "",
      logoUrl: data.logoUrl ?? "",
      primaryColor: data.primaryColor ?? "#2563eb",
    });
    setMessage("Branding de la organización actualizado. Recargá la página para ver los cambios.");
  }

  const isManager = role === "ADMINISTRADOR" || role === "GERENTE";
  const isAdmin = role === "ADMINISTRADOR";

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      {isAdmin && <OnboardingChecklist />}

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Actualiza tu contraseña de acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Contraseña actual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nueva contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Branding de la organización</CardTitle>
            <CardDescription>
              Nombre, color y logo que ven todos los usuarios de tu cooperativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrgBranding} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={orgBranding.name}
                  onChange={(e) => setOrgBranding({ ...orgBranding, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={orgBranding.tagline}
                  onChange={(e) => setOrgBranding({ ...orgBranding, tagline: e.target.value })}
                  placeholder="Gestión de productividad cooperativa"
                />
              </div>
              <div className="space-y-2">
                <Label>URL del logo</Label>
                <Input
                  type="url"
                  value={orgBranding.logoUrl}
                  onChange={(e) => setOrgBranding({ ...orgBranding, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color primario</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={orgBranding.primaryColor}
                    onChange={(e) =>
                      setOrgBranding({ ...orgBranding, primaryColor: e.target.value })
                    }
                  />
                  <Input
                    value={orgBranding.primaryColor}
                    onChange={(e) =>
                      setOrgBranding({ ...orgBranding, primaryColor: e.target.value })
                    }
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
              <Button type="submit" disabled={orgLoading}>
                {orgLoading ? "Guardando..." : "Guardar branding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && plantillas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Motor de premio</CardTitle>
            <CardDescription>
              Elegí la plantilla de cálculo según el reglamento de tu cooperativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePremioTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label>Plantilla</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={premioTemplate}
                  onChange={(e) => setPremioTemplate(e.target.value)}
                >
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {plantillas.find((p) => p.id === premioTemplate)?.descripcion}
                </p>
              </div>

              {premioTemplate === "kpi_simple" && kpiSimpleConfig && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                  <div className="space-y-2">
                    <Label>KPI mínimo (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={kpiSimpleConfig.umbralMinimo}
                      onChange={(e) =>
                        setKpiSimpleConfig({
                          ...kpiSimpleConfig,
                          umbralMinimo: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Premio máximo (% sueldo)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={kpiSimpleConfig.porcentajeMaximo}
                      onChange={(e) =>
                        setKpiSimpleConfig({
                          ...kpiSimpleConfig,
                          porcentajeMaximo: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={templateLoading}>
                {templateLoading ? "Guardando..." : "Guardar plantilla"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && premioConfig && premioTemplate === "art49_cooperativo" && (
        <Card>
          <CardHeader>
            <CardTitle>Premio semestral — Art. 49</CardTitle>
            <CardDescription>
              Tramos a–e del convenio. S1 (ene–jun) se paga en septiembre; S2 (jul–dic) en marzo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePremioConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Antigüedad mínima (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={premioConfig.antiguedadMinimaMeses}
                    onChange={(e) =>
                      setPremioConfig({
                        ...premioConfig,
                        antiguedadMinimaMeses: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Impuntualidad máx. (min c/u)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={premioConfig.impuntualidadMaxMinutos}
                    onChange={(e) =>
                      setPremioConfig({
                        ...premioConfig,
                        impuntualidadMaxMinutos: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cantidad máx. impuntualidades leves</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={premioConfig.impuntualidadMaxCantidad}
                  onChange={(e) =>
                    setPremioConfig({
                      ...premioConfig,
                      impuntualidadMaxCantidad: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    ["tramoA", "a) 30%"],
                    ["tramoB", "b) 5%"],
                    ["tramoC", "c) 5%"],
                    ["tramoD", "d) 5%"],
                    ["tramoE", "e) 5%"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={premioConfig[key]}
                      onChange={(e) =>
                        setPremioConfig({
                          ...premioConfig,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={premioLoading}>
                {premioLoading ? "Guardando..." : "Guardar parámetros"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && <MetasColectivasPanel isAdmin />}

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Restablecer contraseña de empleado</CardTitle>
            <CardDescription>
              Cuando un empleado solicita recuperación, restablece su contraseña aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminReset} className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={resetUserId}
                  onChange={(e) => setResetUserId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar empleado</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit">Restablecer contraseña</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Integración RRHH</CardTitle>
            <CardDescription>
              Endpoint stub para sincronización futura con sistema de RRHH
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <code className="text-xs bg-muted px-1 rounded">POST /api/integrations/rrhh/sync</code>
            </p>
            <p>
              Configurá <code className="text-xs bg-muted px-1 rounded">INTEGRATION_API_KEY</code> en
              el servidor. Payload: <code className="text-xs">apiKey</code> +{" "}
              <code className="text-xs">empleados[]</code> con externalId, email, nombre, apellido,
              area.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
