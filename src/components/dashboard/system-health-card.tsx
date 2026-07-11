"use client";

import { useEffect, useState } from "react";
import { Activity, Database, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthPayload {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  checks: { database: { status: string; latencyMs?: number } };
}

export function SystemHealthCard() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/health");
    if (res.ok) setHealth(await res.json());
    else setHealth(null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const ok = health?.status === "ok";

  return (
    <Card className="glass-card border-emerald-200/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Estado del sistema
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>Health check en vivo — útil antes de demos comerciales</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {!health ? (
          <p className="text-muted-foreground">No se pudo consultar /api/health</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={ok ? "default" : "destructive"}>{health.status}</Badge>
              <Badge variant="outline">v{health.version}</Badge>
            </div>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              DB {health.checks.database.status}
              {health.checks.database.latencyMs != null &&
                ` · ${health.checks.database.latencyMs}ms`}
            </p>
            <p className="text-xs text-muted-foreground">
              Uptime {Math.floor(health.uptimeSeconds / 60)} min · Monitoreo externo:{" "}
              <code className="bg-muted px-1 rounded">scripts/check-health.sh</code>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
