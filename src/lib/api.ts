import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSessionUser } from "./auth";
import { sessionIsVertiaSuperAdmin } from "./super-admin";

export function apiError(message: string, status = 400) {
  console.error(`[API Error ${status}]`, message);
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { error: apiError("No autenticado", 401), user: null };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: apiError("Sin permisos", 403), user: null };
  }
  return { error: null, user };
}

export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return { error: apiError("No autenticado", 401), user: null };
  }
  if (!sessionIsVertiaSuperAdmin(user)) {
    return { error: apiError("Sin permisos de super-admin", 403), user: null };
  }
  return { error: null, user };
}
