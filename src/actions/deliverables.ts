"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { deleteR2Object, uploadDeliverableImage as uploadToR2 } from "@/lib/r2";
import { DeliverableStatus, DeliverableType, ExtraPaymentStatus } from "@prisma/client";

const moveSchema = z.object({
  deliverableId: z.string().min(1),
  estado: z.nativeEnum(DeliverableStatus),
  // Lista de IDs, en orden, de todas las tarjetas que quedan en la columna
  // destino DESPUÉS del drop. Recalculamos `orden` a partir de la posición
  // en este arreglo: es más robusto que enviar un índice suelto porque
  // ignora condiciones de carrera de otros usuarios editando el mismo tablero.
  orderedIdsInTargetColumn: z.array(z.string().min(1)).min(1),
});

export async function moveDeliverable(input: z.infer<typeof moveSchema>) {
  const { agencyId } = await getTenantSession();
  const { deliverableId, estado, orderedIdsInTargetColumn } = moveSchema.parse(input);

  // Verifica que la tarjeta pertenezca al tenant antes de tocar nada.
  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, agencyId },
    select: { id: true },
  });
  if (!deliverable) throw new Error("Entregable no encontrado en esta agencia");

  await prisma.$transaction(
    orderedIdsInTargetColumn.map((id, index) =>
      prisma.deliverable.update({
        where: { id, agencyId },
        data: {
          orden: index,
          ...(id === deliverableId ? { estado } : {}),
        },
      })
    )
  );

  revalidatePath("/[agencySlug]/entregables", "page");
}

const updateDetailsSchema = z.object({
  deliverableId: z.string().min(1),
  titulo: z.string().min(1).max(120),
  descripcion: z.string().max(2000).optional(),
  fechaEntrega: z.coerce.date().optional(),
  linkEjemplo: z.string().url().max(500).optional().or(z.literal("")),
  copy: z.string().max(5000).optional(),
  estado: z.nativeEnum(DeliverableStatus),
  // Solo aplican si el entregable es `esExtra`; se omiten (undefined) para
  // entregables normales, que no llevan costo/estatus de pago propio.
  montoExtra: z.coerce.number().min(0).optional(),
  estatusPagoExtra: z.nativeEnum(ExtraPaymentStatus).optional(),
  // Requerido solo la primera vez que se marca un extra como PAGADO (para
  // saber a qué cuenta entró el dinero). Si ya tiene una transacción
  // registrada, se ignora: no se duplica el ingreso.
  bankAccountId: z.string().min(1).optional(),
});

export async function updateDeliverableDetails(input: z.infer<typeof updateDetailsSchema>) {
  const { agencyId } = await getTenantSession();
  const data = updateDetailsSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.deliverable.findFirst({
      where: { id: data.deliverableId, agencyId },
      include: { transactions: { select: { id: true } } },
    });
    if (!existing) throw new Error("Entregable no encontrado en esta agencia");

    const isBeingMarkedPaidNow =
      existing.esExtra && data.estatusPagoExtra === "PAGADO" && existing.transactions.length === 0;

    if (isBeingMarkedPaidNow) {
      if (!data.bankAccountId) throw new Error("Selecciona la cuenta bancaria que recibió el pago");

      const bankAccount = await tx.bankAccount.findFirst({
        where: { id: data.bankAccountId, agencyId },
      });
      if (!bankAccount) throw new Error("Cuenta bancaria no encontrada en esta agencia");

      const monto = data.montoExtra ?? Number(existing.montoExtra ?? 0);
      if (monto <= 0) throw new Error("El entregable extra no tiene un costo válido registrado");

      await tx.transaction.create({
        data: {
          agencyId,
          bankAccountId: data.bankAccountId,
          clientId: existing.clientId,
          deliverableId: existing.id,
          tipo: "INGRESO",
          monto,
          concepto: `Entregable extra: ${data.titulo}`,
        },
      });

      await tx.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { saldoActual: { increment: monto } },
      });
    }

    await tx.deliverable.update({
      where: { id: data.deliverableId },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        fechaEntrega: data.fechaEntrega,
        linkEjemplo: data.linkEjemplo || null,
        copy: data.copy || null,
        estado: data.estado,
        ...(data.montoExtra !== undefined ? { montoExtra: data.montoExtra } : {}),
        ...(data.estatusPagoExtra !== undefined ? { estatusPagoExtra: data.estatusPagoExtra } : {}),
      },
    });
  });

  revalidatePath("/[agencySlug]/entregables", "page");
  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]", "page");
}

export async function deleteDeliverable(deliverableId: string) {
  const { agencyId } = await getTenantSession();

  const result = await prisma.deliverable.deleteMany({ where: { id: deliverableId, agencyId } });
  if (result.count === 0) throw new Error("Entregable no encontrado en esta agencia");

  revalidatePath("/[agencySlug]/entregables", "page");
}

const createDeliverableSchema = z
  .object({
    clientId: z.string().min(1),
    tipo: z.nativeEnum(DeliverableType),
    titulo: z.string().min(1).max(120),
    descripcion: z.string().max(2000).optional(),
    fechaEntrega: z.coerce.date().optional(),
    linkEjemplo: z.string().url().max(500).optional().or(z.literal("")),
    anio: z.coerce.number().int().min(2000).max(2100),
    mes: z.coerce.number().int().min(1).max(12),
    esExtra: z.boolean().optional().default(false),
    montoExtra: z.coerce.number().min(0.01).optional(),
    estatusPagoExtra: z.nativeEnum(ExtraPaymentStatus).optional(),
    // Requerido si se crea el extra ya marcado como PAGADO.
    bankAccountId: z.string().min(1).optional(),
  })
  .refine((data) => !data.esExtra || data.montoExtra !== undefined, {
    message: "Ingresa el costo del entregable extra",
    path: ["montoExtra"],
  })
  .refine((data) => !(data.esExtra && data.estatusPagoExtra === "PAGADO") || !!data.bankAccountId, {
    message: "Selecciona la cuenta bancaria que recibió el pago",
    path: ["bankAccountId"],
  });

/**
 * Agrega un entregable manualmente a la parrilla de contenido de un cliente
 * para un mes específico. Si `esExtra` es true, se marca como un entregable
 * fuera del contrato (costo adicional) y no cuenta contra la cuota mensual
 * al correr `generateMonthlyDeliverables`; en ese caso lleva su propio monto
 * (libre, varía por entregable) y estatus de cobro (Pendiente/Pagado). Si se
 * crea ya como "Pagado", se registra de una vez el INGRESO en Finanzas.
 */
export async function createDeliverable(input: z.infer<typeof createDeliverableSchema>) {
  const { agencyId } = await getTenantSession();
  const data = createDeliverableSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId } });
  if (!client) throw new Error("Cliente no encontrado en esta agencia");

  await prisma.$transaction(async (tx) => {
    const maxOrden = await tx.deliverable.aggregate({
      where: { agencyId, estado: "EN_PROCESO", anio: data.anio, mes: data.mes },
      _max: { orden: true },
    });

    const deliverable = await tx.deliverable.create({
      data: {
        agencyId,
        clientId: data.clientId,
        tipo: data.tipo,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fechaEntrega: data.fechaEntrega,
        linkEjemplo: data.linkEjemplo || undefined,
        anio: data.anio,
        mes: data.mes,
        esExtra: data.esExtra,
        montoExtra: data.esExtra ? data.montoExtra : undefined,
        estatusPagoExtra: data.esExtra ? (data.estatusPagoExtra ?? "PENDIENTE") : undefined,
        estado: "EN_PROCESO",
        orden: (maxOrden._max.orden ?? -1) + 1,
      },
    });

    if (data.esExtra && data.estatusPagoExtra === "PAGADO") {
      const bankAccount = await tx.bankAccount.findFirst({
        where: { id: data.bankAccountId, agencyId },
      });
      if (!bankAccount) throw new Error("Cuenta bancaria no encontrada en esta agencia");

      await tx.transaction.create({
        data: {
          agencyId,
          bankAccountId: bankAccount.id,
          clientId: data.clientId,
          deliverableId: deliverable.id,
          tipo: "INGRESO",
          monto: data.montoExtra!,
          concepto: `Entregable extra: ${data.titulo}`,
        },
      });

      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: { saldoActual: { increment: data.montoExtra! } },
      });
    }
  });

  revalidatePath("/[agencySlug]/entregables", "page");
  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]", "page");
}

const generateMonthlySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  // Si se omite, genera para todos los clientes activos con cuota
  // configurada (comportamiento original). Si se manda, restringe la
  // generación solo a esos clientes — lo usa el Drawer de selección.
  clientIds: z.array(z.string().min(1)).optional(),
});

/**
 * Crea las tarjetas de entregables faltantes del mes indicado, según el
 * contrato de cada cliente activo (ClientDeliverableConfig). Es idempotente:
 * si un cliente ya tiene, por ejemplo, 2 de los 4 videos de ese mes creados,
 * solo genera los 2 restantes. Se puede correr varias veces sin duplicar.
 * Los entregables marcados `esExtra` no cuentan para esta cuota: son
 * adicionales al contrato, no un reemplazo de él.
 */
export async function generateMonthlyDeliverables(input?: z.infer<typeof generateMonthlySchema>) {
  const { agencyId } = await getTenantSession();
  const now = new Date();
  const { anio, mes, clientIds } = input
    ? generateMonthlySchema.parse(input)
    : { anio: now.getFullYear(), mes: now.getMonth() + 1, clientIds: undefined };

  const configs = await prisma.clientDeliverableConfig.findMany({
    where: {
      agencyId,
      cantidadMensual: { gt: 0 },
      client: { activo: true },
      ...(clientIds ? { clientId: { in: clientIds } } : {}),
    },
    include: { client: { select: { nombreNegocio: true } } },
  });

  let created = 0;

  await prisma.$transaction(async (tx) => {
    const maxOrden = await tx.deliverable.aggregate({
      where: { agencyId, estado: "EN_PROCESO", anio, mes },
      _max: { orden: true },
    });
    let nextOrden = (maxOrden._max.orden ?? -1) + 1;

    for (const config of configs) {
      const existingCount = await tx.deliverable.count({
        where: {
          agencyId,
          clientId: config.clientId,
          tipo: config.tipo,
          anio,
          mes,
          esExtra: false,
        },
      });

      for (let i = existingCount + 1; i <= config.cantidadMensual; i++) {
        await tx.deliverable.create({
          data: {
            agencyId,
            clientId: config.clientId,
            tipo: config.tipo,
            titulo: `${config.tipo === "VIDEO" ? "Video" : "Diseño"} ${i}/${config.cantidadMensual} · ${config.client.nombreNegocio}`,
            estado: "EN_PROCESO",
            orden: nextOrden++,
            anio,
            mes,
          },
        });
        created++;
      }
    }
  });

  revalidatePath("/[agencySlug]/entregables", "page");
  return { created };
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, de sobra para una miniatura de referencia

/**
 * Sube (o reemplaza) la imagen de referencia de un entregable en Cloudflare
 * R2, organizada por carpeta de cliente (`clienteId/...`). Si ya tenía una
 * imagen previa, la anterior se borra de R2 para no dejar archivos huérfanos
 * acumulándose en el bucket.
 */
export async function uploadDeliverableImage(deliverableId: string, formData: FormData) {
  const { agencyId } = await getTenantSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecciona una imagen válida");
  if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error("La imagen no debe pesar más de 5MB");
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");

  const existing = await prisma.deliverable.findFirst({ where: { id: deliverableId, agencyId } });
  if (!existing) throw new Error("Entregable no encontrado en esta agencia");

  const { key, url } = await uploadToR2(existing.clientId, deliverableId, file);

  if (existing.archivoKey) {
    await deleteR2Object(existing.archivoKey).catch(() => {
      // Si el objeto anterior ya no existe en R2 por alguna razón, no debe
      // impedir que se guarde la imagen nueva.
    });
  }

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { archivoUrl: url, archivoKey: key },
  });

  revalidatePath("/[agencySlug]/entregables", "page");
  return { url };
}

export async function removeDeliverableImage(deliverableId: string) {
  const { agencyId } = await getTenantSession();

  const existing = await prisma.deliverable.findFirst({ where: { id: deliverableId, agencyId } });
  if (!existing) throw new Error("Entregable no encontrado en esta agencia");

  if (existing.archivoKey) {
    await deleteR2Object(existing.archivoKey).catch(() => {});
  }

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { archivoUrl: null, archivoKey: null },
  });

  revalidatePath("/[agencySlug]/entregables", "page");
}
