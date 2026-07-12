"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface OnboardingStep {
  id: string;
  titulo: string;
  descripcion: string;
  completado: boolean;
  href: string;
}

export function OnboardingChecklist() {
  const [pasos, setPasos] = useState<OnboardingStep[]>([]);
  const [progreso, setProgreso] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/onboarding");
      if (!res.ok) return;
      const data = await res.json();
      setPasos(data.pasos ?? []);
      setProgreso(data.progreso ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (progreso >= 100) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Onboarding de tu empresa
        </CardTitle>
        <CardDescription>
          Completá estos pasos para dejar ScoreOps listo para el equipo ({progreso}%)
        </CardDescription>
        <Progress value={progreso} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {pasos.map((paso) => (
          <Link
            key={paso.id}
            href={paso.href}
            className="flex items-start gap-3 rounded-lg border bg-background/80 px-3 py-2.5 text-sm hover:bg-background transition-colors"
          >
            {paso.completado ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className={paso.completado ? "text-muted-foreground line-through" : "font-medium"}>
                {paso.titulo}
              </p>
              {!paso.completado && (
                <p className="text-xs text-muted-foreground mt-0.5">{paso.descripcion}</p>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
