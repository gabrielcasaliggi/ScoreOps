import * as Sentry from "@sentry/node";
import { logger, serializeError, type LogContext } from "./logger";

let sentryReady = false;

export function initObservability(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info("observability.init", { sentry: false, reason: "SENTRY_DSN not set" });
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE ?? `scoreops@${process.env.APP_VERSION ?? "0.1.0"}`,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });

  sentryReady = true;
  logger.info("observability.init", { sentry: true });
}

export function captureException(error: unknown, context?: LogContext): void {
  logger.error("exception", {
    ...context,
    error: serializeError(error),
  });

  if (!sentryReady) return;

  Sentry.withScope((scope) => {
    if (context?.organizationId) {
      scope.setTag("organizationId", context.organizationId);
      scope.setContext("tenant", {
        organizationId: context.organizationId,
        organizationSlug: context.organizationSlug,
      });
    }
    if (context?.userId) scope.setUser({ id: context.userId, email: context.userEmail });
    if (context?.route) scope.setTag("route", context.route);
    if (context?.requestId) scope.setTag("requestId", context.requestId);
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, context?: LogContext): void {
  logger.warn(message, context);
  if (!sentryReady) return;

  Sentry.withScope((scope) => {
    if (context?.organizationId) scope.setTag("organizationId", context.organizationId);
    if (context?.userId) scope.setUser({ id: context.userId, email: context.userEmail });
    if (context?.route) scope.setTag("route", context.route);
    Sentry.captureMessage(message, "warning");
  });
}

export function isSentryEnabled(): boolean {
  return sentryReady;
}
