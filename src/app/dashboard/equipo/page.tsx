"use client";

import { useEffect, useState } from "react";
import { CoordinatorDashboard } from "@/components/dashboard/coordinator-dashboard";

export default function EquipoPage() {
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

  return (
    <CoordinatorDashboard
      isAdmin={role === "ADMINISTRADOR"}
      userAreaNombre={areaNombre}
    />
  );
}
