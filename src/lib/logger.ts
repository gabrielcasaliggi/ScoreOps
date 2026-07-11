export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  organizationId?: string;
  organizationSlug?: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  [key: string]: unknown;
}

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  service: string;
  env: string;
  version: string;
  context?: LogContext;
}

const SERVICE = "scoreops";
const VERSION = process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0";

function write(level: LogLevel, msg: string, context?: LogContext) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: SERVICE,
    env: process.env.NODE_ENV ?? "development",
    version: VERSION,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.LOG_LEVEL === "debug") console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  debug: (msg: string, context?: LogContext) => write("debug", msg, context),
  info: (msg: string, context?: LogContext) => write("info", msg, context),
  warn: (msg: string, context?: LogContext) => write("warn", msg, context),
  error: (msg: string, context?: LogContext) => write("error", msg, context),
};

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 8),
    };
  }
  return { value: String(error) };
}

export function sessionToLogContext(user: {
  id: string;
  email: string;
  organizationId: string;
}): LogContext {
  return {
    userId: user.id,
    userEmail: user.email,
    organizationId: user.organizationId,
  };
}
