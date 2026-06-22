import { getSessionUser } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  return apiSuccess({ user });
}
