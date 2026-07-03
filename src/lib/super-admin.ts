import type { SessionUser } from "./auth";

/**
 * Super-admins de Vertia (operación multi-cliente).
 * Configurar en .env: VERTIA_SUPER_ADMIN_EMAILS=admin@vertia.local,ops@vertia.com
 */
export function isVertiaSuperAdmin(email: string): boolean {
  const raw = process.env.VERTIA_SUPER_ADMIN_EMAILS ?? "";
  if (!raw.trim()) return false;

  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

export function sessionIsVertiaSuperAdmin(user: Pick<SessionUser, "email">): boolean {
  return isVertiaSuperAdmin(user.email);
}
