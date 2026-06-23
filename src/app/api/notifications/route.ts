import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAllNotifications, generateNotificationsForUser } from "@/lib/notifications";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  await generateNotificationsForUser(user.id);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const noLeidas = notifications.filter((n) => !n.leida).length;

  return apiSuccess({ notifications, noLeidas });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  try {
    const body = await request.json();

    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, leida: false },
        data: { leida: true },
      });
      return apiSuccess({ ok: true });
    }

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: user.id },
        data: { leida: true },
      });
      return apiSuccess({ ok: true });
    }

    return apiError("Parámetros inválidos");
  } catch (err) {
    console.error("[Notifications] Error:", err);
    return apiError("Error al actualizar notificaciones", 500);
  }
}

export async function POST() {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const created = await generateAllNotifications();
  return apiSuccess({ created });
}
