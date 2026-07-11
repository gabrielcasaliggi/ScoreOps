import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

export const API_KEY_PREFIX = "sk_live_";

export type ApiScope = "stats:read" | "equipo:read" | "rrhh:sync";

export const API_SCOPES: { id: ApiScope; label: string }[] = [
  { id: "stats:read", label: "Leer estadísticas del equipo" },
  { id: "equipo:read", label: "Leer empleados y áreas" },
  { id: "rrhh:sync", label: "Sincronizar empleados (RRHH)" },
];

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKeyRaw(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function getKeyPrefix(raw: string): string {
  return raw.slice(0, 12);
}

export async function createOrganizationApiKey(input: {
  organizationId: string;
  name: string;
  scopes: ApiScope[];
  createdById?: string;
  expiresAt?: Date | null;
}): Promise<{ id: string; key: string; keyPrefix: string }> {
  const raw = generateApiKeyRaw();
  const record = await prisma.organizationApiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      keyPrefix: getKeyPrefix(raw),
      keyHash: hashKey(raw),
      scopes: input.scopes,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return { id: record.id, key: raw, keyPrefix: record.keyPrefix };
}

export interface ApiKeyContext {
  keyId: string;
  organizationId: string;
  scopes: string[];
}

export async function resolveApiKey(
  rawKey: string | null | undefined
): Promise<ApiKeyContext | null> {
  if (!rawKey?.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = hashKey(rawKey);
  const record = await prisma.organizationApiKey.findFirst({
    where: { keyHash, activo: true },
  });

  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  await prisma.organizationApiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    keyId: record.id,
    organizationId: record.organizationId,
    scopes: record.scopes,
  };
}

export function extractApiKeyFromRequest(request: Request): string | null {
  const header = request.headers.get("x-api-key");
  if (header) return header.trim();

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

export function hasScope(ctx: ApiKeyContext, scope: ApiScope): boolean {
  return ctx.scopes.includes(scope);
}
