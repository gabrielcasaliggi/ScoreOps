import { destroySession } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

export async function POST() {
  await destroySession();
  console.log("[Auth] Sesión cerrada");
  return apiSuccess({ ok: true });
}
