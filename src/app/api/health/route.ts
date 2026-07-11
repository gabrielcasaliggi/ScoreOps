import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { isSentryEnabled } from "@/lib/observability";

const startTime = Date.now();

interface HealthCheck {
  status: "ok" | "fail";
  latencyMs?: number;
  message?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Date.now() - t0,
      message: err instanceof Error ? err.message : "Database unreachable",
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get("detailed") === "1";
  const token = request.headers.get("x-health-token");
  const expectedToken = process.env.HEALTH_CHECK_TOKEN;

  if (detailed && expectedToken && token !== expectedToken) {
    return apiError("Token de health inválido", 401);
  }

  const db = await checkDatabase();
  const allOk = db.status === "ok";

  const payload = {
    status: allOk ? ("ok" as const) : ("degraded" as const),
    service: "scoreops",
    version: process.env.APP_VERSION ?? "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database: db,
    },
    ...(detailed
      ? {
          environment: process.env.NODE_ENV ?? "development",
          sentry: isSentryEnabled(),
          appUrl: process.env.APP_URL ?? null,
        }
      : {}),
  };

  return apiSuccess(payload, allOk ? 200 : 503);
}
