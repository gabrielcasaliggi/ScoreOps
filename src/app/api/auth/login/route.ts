import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionCookieValue,
  getSessionCookieName,
  getSessionCookieOptions,
  toSessionUser,
} from "@/lib/auth";
import { apiError } from "@/lib/api";
import {
  getLockoutMessage,
  getRemainingLockoutMinutes,
  isAccountLocked,
  recordLoginAttempt,
} from "@/lib/login-security";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  /** Obligatorio: sin slug no se asume otra empresa por defecto. */
  orgSlug: z.string().min(1, "Indicá el código de empresa"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Credenciales inválidas");
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined;

    if (await isAccountLocked(parsed.data.email)) {
      const mins = await getRemainingLockoutMinutes(parsed.data.email);
      return apiError(`${getLockoutMessage()} (${mins} min restantes)`, 429);
    }

    const orgSlug = parsed.data.orgSlug.trim().toLowerCase();
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });
    if (!org || !org.activo) {
      return apiError("Empresa no encontrada. Revisá el código de empresa.", 404);
    }

    const user = await prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: parsed.data.email.toLowerCase(),
        },
      },
      include: {
        area: { select: { nombre: true, organizationId: true } },
        organization: {
          select: { name: true, slug: true, premioHabilitado: true },
        },
      },
    });

    if (!user) {
      await recordLoginAttempt(parsed.data.email, false, ip);
      return apiError("Email o contraseña incorrectos", 401);
    }

    if (!user.activo) {
      await recordLoginAttempt(parsed.data.email, false, ip);
      return apiError("Cuenta desactivada. Contactá al administrador.", 403);
    }

    if (user.area.organizationId !== user.organizationId) {
      console.error(
        `[Auth] Login bloqueado: ${user.email} tiene área de otra empresa`
      );
      return apiError(
        "Tu usuario tiene un área asignada fuera de esta empresa. Contactá a soporte.",
        403
      );
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password);
    if (!valid) {
      await recordLoginAttempt(parsed.data.email, false, ip);
      return apiError("Email o contraseña incorrectos", 401);
    }

    await recordLoginAttempt(parsed.data.email, true, ip);

    const sessionUser = toSessionUser(user);
    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(
      getSessionCookieName(),
      createSessionCookieValue(sessionUser.id),
      getSessionCookieOptions()
    );

    console.log(`[Auth] Login exitoso: ${user.email}`);
    return response;
  } catch (error) {
    console.error("[Auth] Error en login:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SESSION_SECRET")) {
      return apiError("Configuración de sesión incompleta en el servidor", 500);
    }
    return apiError("Error interno del servidor", 500);
  }
}
