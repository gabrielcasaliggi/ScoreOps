import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Datos inválidos");
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return apiError("Usuario no encontrado", 404);

    const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.password);
    if (!valid) return apiError("Contraseña actual incorrecta", 401);

    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    console.log(`[Auth] Contraseña cambiada: ${user.email}`);
    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[Auth] Error cambio contraseña:", err);
    return apiError("Error al cambiar contraseña", 500);
  }
}
