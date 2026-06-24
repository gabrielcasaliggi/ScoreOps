"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Award,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandIsotype } from "@/components/brand/brand-isotype";
import { BRAND } from "@/lib/brand";
import type { SessionUser } from "@/lib/auth";
import { cn, getInitials } from "@/lib/utils";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isManager = user.role === "ADMINISTRADOR" || user.role === "GERENTE";
  const isAdmin = user.role === "ADMINISTRADOR";

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
        { href: "/dashboard/premio", label: "Premio", icon: Award },
      ]
    : [
        { href: "/dashboard", label: "Mi tablero", icon: LayoutDashboard },
        { href: "/dashboard/tareas", label: "Mis tareas", icon: ClipboardList },
      ];

  const moreNav: NavItem[] = isManager
    ? [
        { href: "/dashboard/asistencia", label: "Asistencia", icon: CalendarClock },
        { href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: Star },
        ...(isAdmin
          ? [
              { href: "/dashboard/empleados", label: "Empleados", icon: Users },
              { href: "/dashboard/auditoria", label: "Auditoría", icon: ClipboardCheck },
            ]
          : []),
      ]
    : [{ href: "/dashboard/evaluaciones", label: "Evaluaciones", icon: Star }];

  const allNav = [...primaryNav, ...moreNav];
  const moreNavActive = moreNav.some((item) => pathname === item.href);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function navLinkClass(active: boolean, compact = false) {
    return cn(
      "flex items-center gap-2 rounded-xl font-medium transition-all duration-200 shrink-0",
      compact ? "px-3 py-2 text-sm" : "px-3.5 py-2 text-sm",
      active
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
        : "text-muted-foreground hover:bg-white/80 hover:text-foreground"
    );
  }

  return (
    <div className="min-h-screen app-mesh-bg">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
              <BrandIsotype size="sm" />
              <span className="hidden font-bold tracking-tight sm:block">
                <span className="text-base lg:text-lg">{BRAND.name}</span>
              </span>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={navLinkClass(moreNavActive)}
                    aria-label="Más secciones"
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Más</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 min-w-[11rem] rounded-xl border bg-white p-1.5 shadow-lg"
                    sideOffset={6}
                    align="start"
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
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
            <div className="hidden items-center gap-2 border-l border-border/60 pl-2 md:flex lg:gap-3 lg:pl-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 text-xs font-bold text-primary ring-2 ring-white">
                {getInitials(user.nombre, user.apellido)}
              </div>
              <div className="hidden text-right text-sm leading-tight xl:block">
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

        <nav className="flex gap-1 overflow-x-auto border-t border-border/50 bg-white/60 px-2 py-1.5 lg:hidden">
          {allNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
