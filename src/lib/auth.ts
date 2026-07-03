import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { Role, User } from "@prisma/client";
import { prisma } from "./prisma";
import { resolveBranding, type OrganizationBranding } from "./organization-brand";

const SESSION_COOKIE = "vertia_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: Role;
  areaId: string;
  areaNombre: string;
  organizationId: string;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurado");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}:${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

function parseSessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [userId, expiresAtStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!userId || Number.isNaN(expiresAt) || !signature) return null;

    if (Date.now() > expiresAt) return null;

    const payload = `${userId}:${expiresAt}`;
    const expected = signPayload(payload);

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    return userId;
  } catch {
    return null;
  }
}

export function toSessionUser(
  user: User & { area: { nombre: string } }
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    role: user.role,
    areaId: user.areaId,
    areaNombre: user.area.nombre,
    organizationId: user.organizationId,
  };
}

export async function getOrganizationBranding(
  organizationId: string
): Promise<OrganizationBranding | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return null;
  return resolveBranding(org);
}

function isSessionCookieSecure(): boolean {
  const explicit = process.env.SESSION_COOKIE_SECURE;
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl?.startsWith("https://")) return true;
  if (appUrl?.startsWith("http://")) return false;

  return process.env.NODE_ENV === "production";
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = createSessionToken(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSessionCookieSecure(),
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = parseSessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { area: true },
  });

  if (!user || !user.activo) return null;
  return toSessionUser(user);
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMINISTRADOR";
}

export function canViewTeamStats(role: Role): boolean {
  return role === "ADMINISTRADOR" || role === "GERENTE";
}

export function canManageObjectives(role: Role): boolean {
  return role === "ADMINISTRADOR" || role === "GERENTE";
}
