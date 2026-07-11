import type { SessionUser } from "./auth";

const DEFAULT_SUPER_ADMIN_EMAILS = "soporte@vertia.local";

/**
 * Super-admins de Vertia (operación multi-cliente).
 * Configurar en .env: VERTIA_SUPER_ADMIN_EMAILS=soporte@vertia.local,ops@vertia.com
 * Si la variable no está definida, usa soporte@vertia.local por defecto.
 */
export function isVertiaSuperAdmin(email: string): boolean {
  const raw = process.env.VERTIA_SUPER_ADMIN_EMAILS?.trim()
    ? process.env.VERTIA_SUPER_ADMIN_EMAILS
    : DEFAULT_SUPER_ADMIN_EMAILS;

  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

export function sessionIsVertiaSuperAdmin(user: Pick<SessionUser, "email">): boolean {
  return isVertiaSuperAdmin(user.email);
}
