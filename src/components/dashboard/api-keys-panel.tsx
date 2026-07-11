"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  activo: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ScopeOption {
  id: string;
  label: string;
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["stats:read"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys ?? []);
      setScopes(data.scopesDisponibles ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setNewKey(null);

    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes: selectedScopes }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }

    setNewKey(data.key);
    setName("");
    load();
  }

  async function revoke(id: string) {
    if (!confirm("¿Revocar esta API key? Las integraciones dejarán de funcionar.")) return;
    await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  function toggleScope(id: string) {
    setSelectedScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function copyKey() {
    if (newKey) navigator.clipboard.writeText(newKey);
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API keys e integraciones
        </CardTitle>
        <CardDescription>
          Claves por organización para BI, RRHH y sistemas externos. Spec OpenAPI en{" "}
          <code className="text-xs bg-muted px-1 rounded">/api/v1/openapi</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {newKey && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-900">Clave creada — copiala ahora</p>
            <div className="flex gap-2">
              <Input readOnly value={newKey} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre (ej. Power BI producción)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label>Permisos</Label>
            <div className="flex flex-wrap gap-2">
              {scopes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleScope(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    selectedScopes.includes(s.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || selectedScopes.length === 0}>
            {loading ? "Creando..." : "Generar API key"}
          </Button>
        </form>

        {keys.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Claves activas</p>
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {k.keyPrefix}… · {k.scopes.join(", ")}
                  </p>
                  {k.lastUsedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Último uso: {new Date(k.lastUsedAt).toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.activo ? "default" : "secondary"}>
                    {k.activo ? "Activa" : "Revocada"}
                  </Badge>
                  {k.activo && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => revoke(k.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Ejemplo — stats del equipo</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">
{`curl -H "X-Api-Key: sk_live_..." \\
  "${appUrl}/api/v1/stats/equipo?periodo=actual"`}
          </pre>
          <p className="font-medium text-foreground mt-3">Ejemplo — sync RRHH</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST -H "X-Api-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"empleados":[{"externalId":"1","email":"...","nombre":"...","apellido":"...","area":"..."}]}' \\
  "${appUrl}/api/integrations/rrhh/sync"`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
