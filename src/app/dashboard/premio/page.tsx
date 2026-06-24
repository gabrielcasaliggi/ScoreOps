"use client";

import { useEffect, useState } from "react";
import { CoordinatorDashboard } from "@/components/dashboard/coordinator-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Award } from "lucide-react";

export default function PremioPage() {
  const [role, setRole] = useState<string | null>(null);
  const [areaNombre, setAreaNombre] = useState<string>();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.user?.role ?? null);
        setAreaNombre(data.user?.areaNombre);
      });
  }, []);

  if (!role) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (role === "EMPLEADO") {
    return (
      <p className="text-muted-foreground">
        El módulo de premio semestral está disponible para gerentes y coordinación.
        Consultá tu desglose en Mi tablero.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Award className="h-6 w-6 shrink-0 text-violet-600" />
            Premio semestral
          </h1>
        }
        description="Art. 49 — liquidación, tramos, metas colectivas y ranking por persona"
      />
      <CoordinatorDashboard
        isAdmin={role === "ADMINISTRADOR"}
        userAreaNombre={areaNombre}
      />
    </div>
  );
}
