import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const schemaByToken = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

const schemaByAdmin = z.object({
  userId: z.string(),
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.token) {
      const parsed = schemaByToken.safeParse(body);
      if (!parsed.success) return apiError("Datos inválidos");

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: parsed.data.token },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return apiError("Token inválido o expirado", 400);
      }

      const hash = await bcrypt.hash(parsed.data.newPassword, 10);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return apiSuccess({ ok: true });
    }

    const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
    if (error || !user) return error;

    const parsed = schemaByAdmin.safeParse(body);
    if (!parsed.success) return apiError("Datos inválidos");

    const target = await prisma.user.findFirst({
      where: { id: parsed.data.userId, organizationId: user.organizationId },
      select: { id: true, areaId: true },
    });
    if (!target) return apiError("Usuario no encontrado", 404);

    if (user.role === "GERENTE" && target.areaId !== user.areaId) {
      return apiError("Sin permisos para este empleado", 403);
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: target.id },
      data: { password: hash },
    });

    await prisma.notification.create({
      data: {
        userId: target.id,
        tipo: "SISTEMA",
        titulo: "Contraseña restablecida",
        mensaje: "Un administrador ha restablecido tu contraseña. Inicia sesión con la nueva contraseña.",
      },
    });

    console.log(`[Auth] Admin ${user.email} reseteó contraseña de ${target.id}`);
    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[Auth] Error reset-password:", err);
    return apiError("Error al restablecer contraseña", 500);
  }
}
