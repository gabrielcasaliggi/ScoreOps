"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  metadata?: { actionUrl?: string } | null;
}

const TIPO_COLORS: Record<string, string> = {
  KPI_RIESGO: "text-red-600 bg-red-50",
  TAREA_VENCIDA: "text-amber-600 bg-amber-50",
  OBJETIVO_PROXIMO: "text-blue-600 bg-blue-50",
  SISTEMA: "text-violet-600 bg-violet-50",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setNoLeidas(data.noLeidas ?? 0);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        title="Notificaciones"
        className={cn("relative rounded-xl", noLeidas > 0 && "animate-bell-ring")}
      >
        <Bell className={cn("h-4 w-4 transition-transform", open && "scale-110")} />
        {noLeidas > 0 && (
          <span className="animate-badge-pulse absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="animate-dropdown-in absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-3">
              <span className="font-semibold text-sm">Notificaciones</span>
              {noLeidas > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Marcar todas
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Sin notificaciones
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "border-b p-3 text-sm last:border-0",
                      !n.leida && "bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5", TIPO_COLORS[n.tipo])}
                          >
                            {n.tipo.replace(/_/g, " ")}
                          </Badge>
                          {!n.leida && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="font-medium">{n.titulo}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{n.mensaje}</p>
                        {n.metadata?.actionUrl && (
                          <Link
                            href={n.metadata.actionUrl}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            onClick={() => {
                              markRead(n.id);
                              setOpen(false);
                            }}
                          >
                            Ir a resolver
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      {!n.leida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => markRead(n.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
