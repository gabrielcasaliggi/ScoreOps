import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api";
import { captureException } from "@/lib/observability";
import { logger } from "@/lib/logger";

const schema = z.object({
  message: z.string().min(1).max(2000),
  digest: z.string().optional(),
  url: z.string().max(500).optional(),
  stack: z.string().max(8000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Payload inválido");
    }

    const requestId = request.headers.get("x-request-id") ?? undefined;
    const error = new Error(parsed.data.message);
    if (parsed.data.stack) error.stack = parsed.data.stack;

    logger.error("client.error", {
      requestId,
      route: parsed.data.url,
      digest: parsed.data.digest,
      error: { message: parsed.data.message },
    });

    captureException(error, {
      requestId,
      route: parsed.data.url ?? "client",
    });

    return apiSuccess({ ok: true });
  } catch (err) {
    logger.error("client.error.handler_failed", { error: String(err) });
    return apiError("Error al registrar", 500);
  }
}
