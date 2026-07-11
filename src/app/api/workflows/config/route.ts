import { apiSuccess, requireAuth } from "@/lib/api";
import { getWorkflowConfig } from "@/lib/workflow-config";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const config = await getWorkflowConfig(user.organizationId);
  return apiSuccess({ config });
}
