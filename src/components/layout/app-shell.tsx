"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Award,
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  Shield,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandIsotype } from "@/components/brand/brand-isotype";
import type { OrganizationBranding } from "@/lib/organization-brand";
import type { SessionUser } from "@/lib/auth";
import { cn, getInitials } from "@/lib/utils";

interface AppShellProps {
  user: SessionUser;
  branding: OrganizationBranding;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "aprobaciones";
}

export function AppShell({ user, branding, isSuperAdmin = false, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [aprobacionesPendientes, setAprobacionesPendientes] = useState(0);

  const isManager = user.role === "ADMINISTRADOR" || user.role === "GERENTE";
  const isAdmin = user.role === "ADMINISTRADOR";
  const premioOn = branding.premioHabilitado;

  useEffect(() => {
    let cancelled = false;
    async function loadBadge() {
      try {
        const res = await fetch("/api/workflows?estado=PENDIENTE");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAprobacionesPendientes(data.pendientes ?? 0);
      } catch {
        /* ignore */
      }
    }
    loadBadge();
    const timer = setInterval(loadBadge, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const showEmpresas = isAdmin && isSuperAdmin;

  const primaryNav: NavItem[] = isManager
    ? [
        { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
        { href: "/dashboard/tareas", label: "Tareas", icon: ClipboardList },
        { href: "/dashboard/objetivos", label: "Objetivos", icon: Target },
        {
          href: "/dashboard/equipo",
          label: isAdmin ? "Equipos" : "Mi equipo",
          icon: Users,
        },
        ...(premioOn
          ? [{ href: "/dashboard/premio", label: "Premio", icon: Award }]
          : []),
        {
          href: "/dashboard/aprobaciones",
          label: isManager ? "Aprobaciones" : "Mis solicitudes",
          icon: ClipboardCheck,
          badgeKey: "aprobaciones" as const,
        },
        ...(isAdmin
          ? [{ href: "/dashboard/ejecutivo", label: "Ejecutivo", icon: BarChart3 }]
          : []),
      ]
    : [
        { href: "/dashboard", label: "Mi tablero", icon: LayoutDashboard },
        { href: "/dashboard/tareas", label: "Mis tareas", icon: ClipboardList },
        {
          href: "/dashboard/aprobaciones",
          label: "Mis solicitudes",
          icon: ClipboardCheck,
          badgeKey: "aprobaciones" as const,
        },
      ];

  const moreNavEmployee: NavItem[] = [
    { href: "/dashboard/mi-asistencia", label: "Mi asistencia", icon: CalendarClock },
    { href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: Star },
  ];

  const moreNav: NavItem[] = isManager
    ? [
        { href: "/dashboard/asistencia", label: "Asistencia", icon: CalendarClock },
        { href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: Star },
        ...(isAdmin
          ? [
              { href: "/dashboard/empleados", label: "Empleados", icon: Users },
              ...(premioOn
                ? [{ href: "/dashboard/auditoria", label: "Auditoría", icon: ClipboardCheck }]
                : []),
            ]
          : []),
      ]
    : moreNavEmployee;

  const allNav = [
    ...(showEmpresas
      ? [{ href: "/dashboard/superadmin", label: "Empresas", icon: Shield }]
      : []),
    ...primaryNav,
    ...moreNav,
  ];
  const moreNavActive = moreNav.some((item) => pathname === item.href);
  const empresasActive = pathname === "/dashboard/superadmin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function navLinkClass(active: boolean, compact = false) {
    return cn(
      "relative flex items-center gap-2 rounded-xl font-medium transition-all duration-200 shrink-0",
      compact ? "px-3 py-2 text-sm" : "px-3.5 py-2 text-sm",
      active
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
        : "text-muted-foreground hover:bg-white/80 hover:text-foreground"
    );
  }

  function badgeFor(item: NavItem) {
    if (item.badgeKey === "aprobaciones" && aprobacionesPendientes > 0) {
      return aprobacionesPendientes > 9 ? "9+" : String(aprobacionesPendientes);
    }
    return null;
  }

  function NavBadge({ value, active }: { value: string; active: boolean }) {
    return (
      <span
        className={cn(
          "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
          active ? "bg-white text-primary" : "bg-destructive text-white"
        )}
      >
        {value}
      </span>
    );
  }

  return (
    <div className="min-h-screen app-mesh-bg">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Link
            href="/dashboard"
            className="group flex max-w-[10rem] shrink-0 items-center gap-2 transition-transform duration-300 hover:scale-[1.02] sm:max-w-[12rem]"
          >
            <BrandIsotype size="sm" className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
            <span className="hidden truncate font-bold tracking-tight sm:block">
              <span className="text-sm lg:text-base">{branding.name}</span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto scrollbar-none md:flex lg:gap-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const badge = badgeFor(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(navLinkClass(active, true), "group")}
                  title={item.label}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 icon-hover-pop", active && "nav-icon-active")} />
                  <span className="hidden whitespace-nowrap lg:inline">{item.label}</span>
                  {badge && <NavBadge value={badge} active={active} />}
                </Link>
              );
            })}

            {moreNav.length > 0 && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={navLinkClass(moreNavActive, true)}
                    aria-label="Más secciones"
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span className="hidden whitespace-nowrap lg:inline">Más</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 min-w-[11rem] rounded-xl border bg-white p-1.5 shadow-lg"
                    sideOffset={6}
                    align="end"
                  >
                    {moreNav.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <DropdownMenu.Item key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                              active
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1.5">
            {showEmpresas && (
              <Link
                href="/dashboard/superadmin"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold tracking-tight shadow-sm transition-all sm:px-3 sm:text-sm",
                  empresasActive
                    ? "bg-slate-900 text-white shadow-slate-900/25"
                    : "bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md"
                )}
                title="Gestionar empresas"
              >
                <Shield className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span>Empresas</span>
              </Link>
            )}
            <NotificationBell />
            <Link href="/dashboard/configuracion">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-white/80"
                title="Configuración"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <div className="hidden items-center gap-2 border-l border-border/60 pl-2 md:flex lg:pl-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 text-xs font-bold text-primary ring-2 ring-white">
                {getInitials(user.nombre, user.apellido)}
              </div>
              <div className="hidden text-right text-sm leading-tight 2xl:block">
                <p className="font-semibold">
                  {user.nombre} {user.apellido}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {user.role.replace("_", " ")} · {user.areaNombre}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-white/80"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex gap-0.5 overflow-x-auto border-t border-border/50 bg-white/60 px-2 py-1.5 scrollbar-none md:hidden">
          {allNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const badge = badgeFor(item);
            const isEmpresas = item.href === "/dashboard/superadmin";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors",
                  isEmpresas
                    ? active
                      ? "bg-slate-900 text-white"
                      : "bg-teal-600 text-white"
                    : active
                      ? "text-primary"
                      : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", !isEmpresas && active && "text-primary")} />
                  {badge && (
                    <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1 font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 animate-page-enter">{children}</main>
    </div>
  );
}
