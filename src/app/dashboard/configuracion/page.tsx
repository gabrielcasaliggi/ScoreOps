"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  KeyRound,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { MetasColectivasPanel } from "@/components/dashboard/metas-colectivas-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel";
import { cn } from "@/lib/utils";

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

interface WorkflowConfig {
  tareaRequiereAprobacion: boolean;
  kpiAjusteRequiereAprobacion: boolean;
}

type MainSection = "cuenta" | "equipo" | "empresa";
type EmpresaTab = "general" | "flujos" | "premio" | "integraciones";

const TRAMO_META: { key: keyof PremioConfig; nombre: string }[] = [
  { key: "tramoA", nombre: "Productividad (a)" },
  { key: "tramoB", nombre: "Presentismo (b)" },
  { key: "tramoC", nombre: "Puntualidad (c)" },
  { key: "tramoD", nombre: "Metas colectivas (d)" },
  { key: "tramoE", nombre: "Evaluación (e)" },
];

function Feedback({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      className={cn(
        "text-sm rounded-lg px-3 py-2",
        error ? "text-destructive bg-destructive/5 border border-destructive/20" : "text-emerald-700 bg-emerald-50 border border-emerald-200"
      )}
      role="status"
    >
      {error || message}
    </p>
  );
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const [role, setRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [premioConfig, setPremioConfig] = useState<PremioConfig | null>(null);
  const [premioLoading, setPremioLoading] = useState(false);
  const [premioError, setPremioError] = useState("");
  const [premioMessage, setPremioMessage] = useState("");
  const [premioTemplate, setPremioTemplate] = useState("art49_cooperativo");
  const [plantillas, setPlantillas] = useState<PlantillaPremio[]>([]);
  const [kpiSimpleConfig, setKpiSimpleConfig] = useState<KpiSimpleConfig | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [orgBranding, setOrgBranding] = useState({
    name: "",
    tagline: "",
    logoUrl: "",
    primaryColor: "#0f766e",
  });
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [orgMessage, setOrgMessage] = useState("");
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [premioHabilitado, setPremioHabilitado] = useState(true);

  const [mainSection, setMainSection] = useState<MainSection>("cuenta");
  const [empresaTab, setEmpresaTab] = useState<EmpresaTab>("general");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        const userRole = data.user?.role ?? null;
        setRole(userRole);
        setIsSuperAdmin(Boolean(data.user?.isSuperAdmin));
        setPremioHabilitado(data.user?.premioHabilitado !== false);

        if (userRole === "ADMINISTRADOR") {
          setMainSection("empresa");
        } else if (userRole === "GERENTE") {
          setMainSection("cuenta");
        }

        if (userRole === "ADMINISTRADOR" || userRole === "GERENTE") {
          fetch("/api/usuarios")
            .then((r) => r.json())
            .then(setUsuarios);
        }
        if (userRole === "ADMINISTRADOR") {
          fetch("/api/admin/config")
            .then((r) => r.json())
            .then((cfg) => {
              setPremioConfig(cfg.art49);
              setPremioTemplate(cfg.premioTemplate ?? "art49_cooperativo");
              setKpiSimpleConfig(cfg.kpiSimple ?? null);
              setPlantillas(cfg.plantillas ?? []);
              setWorkflowConfig(cfg.workflow ?? null);
            });
          fetch("/api/organization")
            .then((r) => r.json())
            .then((org) => {
              if (org.name) {
                setOrgBranding({
                  name: org.name ?? "",
                  tagline: org.tagline ?? "",
                  logoUrl: org.logoUrl ?? "",
                  primaryColor: org.primaryColor ?? "#0f766e",
                });
              }
            });
        }
      });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (newPassword !== confirmPassword) {
      setPwError("Las contraseñas no coinciden");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? "Error al cambiar contraseña");
        return;
      }
      setPwMessage("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Error de conexión");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleAdminReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error ?? "Error al restablecer");
      return;
    }
    setResetMessage("Contraseña del empleado restablecida.");
    setResetPassword("");
  }

  async function handlePremioConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!premioConfig) return;
    setPremioLoading(true);
    setPremioError("");
    setPremioMessage("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ art49: premioConfig }),
    });
    const data = await res.json();
    setPremioLoading(false);
    if (!res.ok) {
      setPremioError(data.error ?? "Error al guardar configuración");
      return;
    }
    setPremioConfig(data.art49);
    setPremioMessage("Parámetros Art. 49 guardados");
  }

  async function handlePremioTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateLoading(true);
    setPremioError("");
    setPremioMessage("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        premioTemplate,
        ...(premioTemplate === "kpi_simple" && kpiSimpleConfig
          ? { kpiSimple: kpiSimpleConfig }
          : {}),
      }),
    });
    const data = await res.json();
    setTemplateLoading(false);
    if (!res.ok) {
      setPremioError(data.error ?? "Error al guardar plantilla");
      return;
    }
    setPremioTemplate(data.premioTemplate);
    setKpiSimpleConfig(data.kpiSimple);
    setPremioMessage("Plantilla de premio actualizada");
  }

  async function handleWorkflowConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!workflowConfig) return;
    setWorkflowLoading(true);
    setWorkflowError("");
    setWorkflowMessage("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow: workflowConfig }),
    });
    const data = await res.json();
    setWorkflowLoading(false);
    if (!res.ok) {
      setWorkflowError(data.error ?? "Error al guardar flujos");
      return;
    }
    setWorkflowConfig(data.workflow);
    setWorkflowMessage("Flujos de aprobación actualizados");
  }

  async function handleOrgBranding(e: React.FormEvent) {
    e.preventDefault();
    setOrgLoading(true);
    setOrgError("");
    setOrgMessage("");

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
      setOrgError(data.error ?? "Error al guardar branding");
      return;
    }
    setOrgBranding({
      name: data.name ?? "",
      tagline: data.tagline ?? "",
      logoUrl: data.logoUrl ?? "",
      primaryColor: data.primaryColor ?? "#0f766e",
    });
    setOrgMessage("Marca actualizada");
    router.refresh();
  }

  const isManager = role === "ADMINISTRADOR" || role === "GERENTE";
  const isAdmin = role === "ADMINISTRADOR";

  if (!role) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  const mainNav: { id: MainSection; label: string; show: boolean; icon: typeof Settings2 }[] = [
    { id: "cuenta", label: "Mi cuenta", show: true, icon: KeyRound },
    { id: "equipo", label: "Equipo", show: isManager, icon: Users },
    { id: "empresa", label: "Empresa", show: isAdmin, icon: Building2 },
  ];

  const empresaTabs: { id: EmpresaTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "flujos", label: "Aprobaciones" },
    { id: "premio", label: "Premio" },
    { id: "integraciones", label: "Integraciones" },
  ];

  const sumaTramos = premioConfig
    ? TRAMO_META.reduce((s, t) => s + Number(premioConfig[t.key] || 0), 0)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={<h1 className="text-2xl font-bold tracking-tight">Configuración</h1>}
        description={
          isAdmin
            ? "Tu acceso, el equipo y las políticas de la empresa"
            : isManager
              ? "Tu acceso y restablecimiento de contraseñas del equipo"
              : "Gestioná tu acceso al sistema"
        }
      />

      {isSuperAdmin && (
        <Card className="border-teal-200/70 bg-gradient-to-r from-teal-50/90 to-indigo-50/40">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Gestión multi-empresa</p>
                <p className="text-sm text-muted-foreground">
                  Creá empresas y administrá tenants desde Empresas.
                </p>
              </div>
            </div>
            <Button asChild className="rounded-xl w-full sm:w-auto">
              <Link href="/dashboard/superadmin">
                Ir a Empresas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && mainSection === "empresa" && <OnboardingChecklist />}

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {mainNav
          .filter((n) => n.show)
          .map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setMainSection(n.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                  mainSection === n.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
      </div>

      {mainSection === "cuenta" && (
        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Actualizá tu contraseña de acceso al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
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
              <Feedback error={pwError} message={pwMessage} />
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {mainSection === "equipo" && isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Restablecer acceso</CardTitle>
            <CardDescription>
              Cuando un empleado pide recuperación, definí una contraseña temporal acá.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminReset} className="space-y-4 max-w-md">
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
              <Feedback error={resetError} message={resetMessage} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Restablecer contraseña</Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/dashboard/empleados">Ir a Empleados</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mainSection === "empresa" && isAdmin && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
            {empresaTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEmpresaTab(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  empresaTab === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {empresaTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle>Marca de la empresa</CardTitle>
                <CardDescription>
                  Nombre, color y logo visibles para todo el equipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrgBranding} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Nombre</Label>
                      <Input
                        value={orgBranding.name}
                        onChange={(e) =>
                          setOrgBranding({ ...orgBranding, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Tagline</Label>
                      <Input
                        value={orgBranding.tagline}
                        onChange={(e) =>
                          setOrgBranding({ ...orgBranding, tagline: e.target.value })
                        }
                        placeholder="Gestión de productividad"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>URL del logo</Label>
                      <Input
                        type="url"
                        value={orgBranding.logoUrl}
                        onChange={(e) =>
                          setOrgBranding({ ...orgBranding, logoUrl: e.target.value })
                        }
                        placeholder="https://..."
                      />
                      {orgBranding.logoUrl && (
                        // Preview remoto: URL arbitraria del admin
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={orgBranding.logoUrl}
                          alt="Vista previa logo"
                          className="mt-2 h-12 w-auto max-w-[180px] object-contain rounded border bg-white p-1"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Color primario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="h-10 w-14 cursor-pointer p-1"
                          value={orgBranding.primaryColor}
                          onChange={(e) =>
                            setOrgBranding({
                              ...orgBranding,
                              primaryColor: e.target.value,
                            })
                          }
                        />
                        <Input
                          value={orgBranding.primaryColor}
                          onChange={(e) =>
                            setOrgBranding({
                              ...orgBranding,
                              primaryColor: e.target.value,
                            })
                          }
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </div>
                  </div>
                  <Feedback error={orgError} message={orgMessage} />
                  <Button type="submit" disabled={orgLoading}>
                    {orgLoading ? "Guardando..." : "Guardar marca"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {empresaTab === "flujos" && (
            workflowConfig ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Flujos de aprobación</CardTitle>
                    <CardDescription className="mt-1.5">
                      Definí si el empleado necesita revisión del gerente antes de cerrar
                      tareas o cambiar KPIs.
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href="/dashboard/aprobaciones">
                      <ClipboardCheck className="h-4 w-4 mr-1.5" />
                      Ver cola
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWorkflowConfig} className="space-y-4">
                  <label className="flex items-start gap-3 rounded-xl border p-3 text-sm cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={workflowConfig.tareaRequiereAprobacion}
                      onChange={(e) =>
                        setWorkflowConfig({
                          ...workflowConfig,
                          tareaRequiereAprobacion: e.target.checked,
                        })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-input"
                    />
                    <span>
                      <span className="font-medium block">Tareas a revisión</span>
                      <span className="text-muted-foreground text-xs">
                        Al marcar completada, la tarea queda en Por aprobar hasta que el
                        gerente decida.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border p-3 text-sm cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={workflowConfig.kpiAjusteRequiereAprobacion}
                      onChange={(e) =>
                        setWorkflowConfig({
                          ...workflowConfig,
                          kpiAjusteRequiereAprobacion: e.target.checked,
                        })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-input"
                    />
                    <span>
                      <span className="font-medium block">Ajustes de KPI con solicitud</span>
                      <span className="text-muted-foreground text-xs">
                        El valor no cambia hasta que un gerente o admin apruebe.
                      </span>
                    </span>
                  </label>
                  <Feedback error={workflowError} message={workflowMessage} />
                  <Button type="submit" disabled={workflowLoading}>
                    {workflowLoading ? "Guardando..." : "Guardar flujos"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-6">Cargando flujos...</p>
            )
          )}

          {empresaTab === "premio" && (
            <div className="space-y-5">
              {!premioHabilitado ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    El módulo de premio está desactivado para esta empresa. Contactá a
                    soporte Vertia si necesitás habilitarlo.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {plantillas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Motor de premio</CardTitle>
                        <CardDescription>
                          Plantilla de cálculo según el reglamento de tu empresa
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

                          <Feedback error={premioError} message={premioMessage} />
                          <Button type="submit" disabled={templateLoading}>
                            {templateLoading ? "Guardando..." : "Guardar plantilla"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {premioConfig && premioTemplate === "art49_cooperativo" && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Parámetros Art. 49</CardTitle>
                        <CardDescription>
                          Tramos del convenio. S1 (ene–jun) se paga en septiembre; S2
                          (jul–dic) en marzo.
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
                          <div>
                            <p className="text-sm font-medium mb-2">
                              % del sueldo por tramo{" "}
                              <span className="text-muted-foreground font-normal">
                                (suma: {sumaTramos}%)
                              </span>
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {TRAMO_META.map(({ key, nombre }) => (
                                <div key={key} className="space-y-1">
                                  <Label className="text-xs">
                                    {nombre}: {premioConfig[key]}%
                                  </Label>
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
                          </div>
                          <Feedback error={premioError} message={premioMessage} />
                          <Button type="submit" disabled={premioLoading}>
                            {premioLoading ? "Guardando..." : "Guardar parámetros"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  <MetasColectivasPanel isAdmin />
                </>
              )}
            </div>
          )}

          {empresaTab === "integraciones" && <ApiKeysPanel />}
        </div>
      )}
    </div>
  );
}
