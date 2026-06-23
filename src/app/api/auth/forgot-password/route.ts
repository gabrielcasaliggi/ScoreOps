import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Email inválido");

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    // Respuesta genérica para no revelar si el email existe
    if (!user) {
      return apiSuccess({
        message:
          "Si el email está registrado, se ha notificado al administrador para restablecer tu contraseña.",
      });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMINISTRADOR", "GERENTE"] } },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          tipo: "SISTEMA",
          titulo: "Solicitud de restablecimiento de contraseña",
          mensaje: `${user.nombre} ${user.apellido} (${user.email}) solicitó restablecer su contraseña.`,
          metadata: {
            resetToken: token,
            userId: user.id,
            userEmail: user.email,
          },
        },
      });
    }

    console.log(`[Auth] Reset solicitado para: ${user.email}`);
    return apiSuccess({
      message:
        "Si el email está registrado, se ha notificado al administrador para restablecer tu contraseña.",
    });
  } catch (err) {
    console.error("[Auth] Error forgot-password:", err);
    return apiError("Error al procesar solicitud", 500);
  }
}
