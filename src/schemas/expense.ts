import { z } from "zod";

export const ExpenseSchema = z.object({
  monto: z.number().positive(),
  concepto: z.string().min(2),
  moneda: z.string().default("MXN"),
  categoria: z.enum(["insumos", "servicios", "otros"]).optional(),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]).optional(),
  proveedor: z.string().optional(),
  fecha: z.string().optional(), // ISO date/time o date; en consola lo dejamos simple
  notas: z.string().optional()
});

export const ExpenseDraftSchema = z.object({
  monto: z.number().positive().optional(),
  concepto: z.string().min(2).optional(),
  moneda: z.string().optional(),
  categoria: z.enum(["insumos", "servicios", "otros"]).optional(),
  metodo_pago: z.enum(["efectivo", "transferencia", "tarjeta"]).optional(),
  proveedor: z.string().optional(),
  fecha: z.string().optional(),
  notas: z.string().optional()
}).strict();

export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpenseDraft = z.infer<typeof ExpenseDraftSchema>;
