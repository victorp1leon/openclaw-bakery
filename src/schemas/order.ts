import { z } from "zod";

export const OrderSchema = z.object({
  nombre_cliente: z.string().min(2),
  producto: z.string().min(2),
  cantidad: z.number().int().positive(),
  tipo_envio: z.enum(["envio_domicilio", "recoger_en_tienda"]),
  fecha_hora_entrega: z.string().min(4), // luego lo normalizamos a datetime local
  direccion: z.string().optional(),

  telefono: z.string().optional(),
  descripcion_producto: z.string().optional(),
  sabor_pan: z.enum(["vainilla", "chocolate", "red_velvet", "otro"]).optional(),
  sabor_relleno: z.enum(["cajeta", "mermelada_fresa", "oreo"]).optional(),
  estado_pago: z.enum(["pagado", "pendiente", "parcial"]).optional(),
  total: z.number().optional(),
  moneda: z.string().default("MXN"),
  notas: z.string().optional()
}).superRefine((val, ctx) => {
  if (val.tipo_envio === "envio_domicilio" && !val.direccion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["direccion"],
      message: "direccion es obligatoria si tipo_envio = envio_domicilio"
    });
  }
});

export const OrderDraftSchema = z.object({
  nombre_cliente: z.string().min(2).optional(),
  producto: z.string().min(2).optional(),
  cantidad: z.number().int().positive().optional(),
  tipo_envio: z.enum(["envio_domicilio", "recoger_en_tienda"]).optional(),
  fecha_hora_entrega: z.string().min(4).optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  descripcion_producto: z.string().optional(),
  sabor_pan: z.enum(["vainilla", "chocolate", "red_velvet", "otro"]).optional(),
  sabor_relleno: z.enum(["cajeta", "mermelada_fresa", "oreo"]).optional(),
  estado_pago: z.enum(["pagado", "pendiente", "parcial"]).optional(),
  total: z.number().positive().optional(),
  moneda: z.string().optional(),
  notas: z.string().optional()
}).strict();

export type Order = z.infer<typeof OrderSchema>;
export type OrderDraft = z.infer<typeof OrderDraftSchema>;
