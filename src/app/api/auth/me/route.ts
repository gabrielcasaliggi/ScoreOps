import { getSessionUser } from "@/lib/auth";
import { sessionIsVertiaSuperAdmin } from "@/lib/super-admin";
import { apiSuccess } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiSuccess({ user: null });
  return apiSuccess({
    user: {
      ...user,
      isSuperAdmin: sessionIsVertiaSuperAdmin(user),
    },
  });
}
