import { apiSuccess } from "@/lib/api";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "ScoreOps API",
    version: "1.0.0",
    description:
      "API pública de ScoreOps para integraciones RRHH y BI. Autenticación por API key por organización.",
  },
  servers: [{ url: APP_URL }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "Clave sk_live_... generada en Configuración → API keys",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Alternativa: Authorization: Bearer sk_live_...",
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/api/v1/stats/equipo": {
      get: {
        summary: "Estadísticas del equipo",
        description: "Requiere scope stats:read",
        parameters: [
          {
            name: "periodo",
            in: "query",
            schema: { type: "string", enum: ["actual", "anterior"] },
          },
          { name: "areaId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Resumen y listado de empleados con KPI y premio" },
          "401": { description: "API key inválida" },
          "403": { description: "Scope insuficiente" },
        },
      },
    },
    "/api/integrations/rrhh/sync": {
      post: {
        summary: "Sincronizar empleados desde RRHH",
        description:
          "Requiere scope rrhh:sync (header X-Api-Key) o legacy INTEGRATION_API_KEY en body.apiKey",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  apiKey: { type: "string", description: "Legacy — omitir si usás X-Api-Key" },
                  empleados: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["externalId", "email", "nombre", "apellido", "area"],
                      properties: {
                        externalId: { type: "string" },
                        legajo: { type: "string" },
                        email: { type: "string", format: "email" },
                        nombre: { type: "string" },
                        apellido: { type: "string" },
                        area: { type: "string" },
                        activo: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sincronización OK" },
        },
      },
    },
  },
};

export async function GET() {
  return apiSuccess(spec);
}
