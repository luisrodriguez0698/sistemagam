"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { CampaignPayer } from "@prisma/client";

const campaignSchema = z
  .object({
    nombre: z.string().min(1).max(150),
    clientId: z.string().min(1),
    deliverableId: z.string().min(1).optional(),
    montoInvertido: z.coerce.number().positive("El monto debe ser mayor a 0"),
    pagadoPor: z.nativeEnum(CampaignPayer),
    fecha: z.coerce.date().optional(),
    // Requerida solo si `pagadoPor` = AGENCIA (de ahí sale/se descuenta el dinero).
    bankAccountId: z.string().min(1).optional(),
  })
  .refine((data) => data.pagadoPor !== "AGENCIA" || !!data.bankAccountId, {
    message: "Selecciona la cuenta bancaria de la que se descuenta la inversión",
    path: ["bankAccountId"],
  });

/**
 * Registra una campaña de publicidad. Si la paga la agencia, además crea el
 * GASTO correspondiente en Finanzas (categoría Publicidad) y descuenta la
 * cuenta bancaria elegida, todo en una sola transacción atómica; si la paga
 * el cliente con su propia tarjeta, solo queda el registro informativo, sin
 * tocar ninguna cuenta.
 */
export async function createCampaign(input: z.infer<typeof campaignSchema>) {
  const { agencyId } = await getTenantSession();
  const data = campaignSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId } });
  if (!client) throw new Error("Cliente no encontrado en esta agencia");

  if (data.deliverableId) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: data.deliverableId, agencyId, clientId: data.clientId },
    });
    if (!deliverable) throw new Error("Entregable no encontrado para este cliente");
  }

  const fecha = data.fecha ?? new Date();

  await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        agencyId,
        clientId: data.clientId,
        deliverableId: data.deliverableId,
        nombre: data.nombre,
        montoInvertido: data.montoInvertido,
        pagadoPor: data.pagadoPor,
        fecha,
      },
    });

    if (data.pagadoPor === "AGENCIA") {
      const bankAccount = await tx.bankAccount.findFirst({ where: { id: data.bankAccountId!, agencyId } });
      if (!bankAccount) throw new Error("Cuenta bancaria no encontrada en esta agencia");
      if (Number(bankAccount.saldoActual) - data.montoInvertido < 0) {
        throw new Error("Saldo insuficiente en la cuenta seleccionada");
      }

      await tx.transaction.create({
        data: {
          agencyId,
          bankAccountId: bankAccount.id,
          clientId: data.clientId,
          campaignId: campaign.id,
          tipo: "GASTO",
          categoriaGasto: "PUBLICIDAD",
          concepto: `Campaña: ${data.nombre}`,
          monto: data.montoInvertido,
          fecha,
        },
      });

      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: { saldoActual: { decrement: data.montoInvertido } },
      });
    }
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
}

/**
 * Elimina el registro de la campaña. A propósito NO borra ni revierte el
 * GASTO que haya generado en Finanzas (mismo criterio que borrar un
 * entregable extra): el dinero ya salió de la cuenta y ese movimiento
 * contable debe seguir existiendo. Para revertir el gasto real, se borra
 * la transacción directamente desde Finanzas.
 */
export async function deleteCampaign(campaignId: string) {
  const { agencyId } = await getTenantSession();

  const result = await prisma.campaign.deleteMany({ where: { id: campaignId, agencyId } });
  if (result.count === 0) throw new Error("Campaña no encontrada en esta agencia");

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
}
