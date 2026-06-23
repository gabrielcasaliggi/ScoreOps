import { z } from "zod";

const optionalPassword = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.string().min(6, "Mínimo 6 caracteres").optional());

export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  legajo: z.string().min(1, "Legajo requerido").optional(),
  telefono: z.string().optional(),
  role: z.enum(["ADMINISTRADOR", "GERENTE", "EMPLEADO"]).default("EMPLEADO"),
  areaId: z.string().min(1, "Área requerida"),
  password: optionalPassword,
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  legajo: z.string().min(1).nullable().optional(),
  telefono: z.string().nullable().optional(),
  sueldoBasico: z.number().min(0).nullable().optional(),
  valorAntiguedad: z.number().min(0).nullable().optional(),
  role: z.enum(["ADMINISTRADOR", "GERENTE", "EMPLEADO"]).optional(),
  areaId: z.string().min(1).optional(),
  activo: z.boolean().optional(),
  password: optionalPassword,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
