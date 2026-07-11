import { apiError } from "./api";
import {
  extractApiKeyFromRequest,
  hasScope,
  resolveApiKey,
  type ApiKeyContext,
  type ApiScope,
} from "./api-key";

export async function requireApiKey(
  request: Request,
  scopes: ApiScope[]
): Promise<{ error: ReturnType<typeof apiError> | null; ctx: ApiKeyContext | null }> {
  const raw = extractApiKeyFromRequest(request);
  if (!raw) {
    return { error: apiError("API key requerida (header X-Api-Key o Authorization: Bearer)", 401), ctx: null };
  }

  const ctx = await resolveApiKey(raw);
  if (!ctx) {
    return { error: apiError("API key inválida o expirada", 401), ctx: null };
  }

  for (const scope of scopes) {
    if (!hasScope(ctx, scope)) {
      return { error: apiError(`Scope requerido: ${scope}`, 403), ctx: null };
    }
  }

  return { error: null, ctx };
}
