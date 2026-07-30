"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";

const setOmitidoSchema = z.object({
  clientId: z.string().min(1),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  omitido: z.boolean(),
});

/**
 * Marca (o desmarca) el cargo mensual de un cliente como omitido — para
 * cuando por alguna razón no se le puede cobrar ese mes (se le condonó, un
 * acuerdo especial, etc.), sin tener que simular un pago que no existió. Si
 * el cargo de ese mes todavía no existe (ej. un mes futuro), se crea.
 */
export async function setClientBillingOmitido(input: z.infer<typeof setOmitidoSchema>) {
  const { agencyId } = await getTenantSession();
  const data = setOmitidoSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId } });
  if (!client) throw new Error("Cliente no encontrado en esta agencia");

  await prisma.clientBilling.upsert({
    where: { clientId_anio_mes: { clientId: data.clientId, anio: data.anio, mes: data.mes } },
    create: {
      agencyId,
      clientId: data.clientId,
      anio: data.anio,
      mes: data.mes,
      montoEsperado: client.totalMensualidad,
      omitido: data.omitido,
    },
    update: { omitido: data.omitido },
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
  revalidatePath("/[agencySlug]", "page");
}
