import { cache } from "react";
import { endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { PaymentStatus } from "@prisma/client";

// Si el cliente no tiene un día de cobro definido, se considera vencido
// después del día 5 de cada mes.
const DEFAULT_CUTOFF_DAY = 5;

export interface ClientBillingSummary {
  clientId: string;
  anio: number;
  mes: number;
  montoEsperado: number;
  montoPagado: number;
  saldoPendiente: number;
  estatus: PaymentStatus;
}

/**
 * Genera (si no existen) los cargos mensuales (`ClientBilling`) del mes en
 * curso para cada cliente activo cuya `fechaContratacion` ya haya iniciado,
 * y devuelve cuánto lleva pagado/resta cada uno según los abonos
 * (Transaction) ligados a ese cargo. También sincroniza `Client.estatusPago`
 * para que las consultas existentes (alertas, notificaciones) sigan
 * funcionando sin reescribirlas.
 *
 * No hay cron en este proyecto: esto se corre "al vuelo" en cada request,
 * envuelto en `cache()` de React para que aunque el layout y varias páginas
 * lo llamen en el mismo request, solo se ejecute una vez.
 */
export const ensurePaymentStatusesFresh = cache(async (agencyId: string): Promise<ClientBillingSummary[]> => {
  const now = new Date();
  const anio = now.getFullYear();
  const mes = now.getMonth() + 1;
  const periodEnd = endOfMonth(now);
  const today = now.getDate();

  const allActiveClients = await prisma.client.findMany({
    where: { agencyId, activo: true },
    select: {
      id: true,
      diaCobro: true,
      estatusPago: true,
      totalMensualidad: true,
      fechaContratacion: true,
    },
  });

  const eligibleClients = allActiveClients.filter((c) => c.fechaContratacion <= periodEnd);
  const notStartedClients = allActiveClients.filter((c) => c.fechaContratacion > periodEnd);

  if (eligibleClients.length > 0) {
    await prisma.clientBilling.createMany({
      data: eligibleClients.map((c) => ({
        agencyId,
        clientId: c.id,
        anio,
        mes,
        montoEsperado: c.totalMensualidad,
      })),
      skipDuplicates: true,
    });
  }

  const billings = await prisma.clientBilling.findMany({
    where: { agencyId, anio, mes, clientId: { in: eligibleClients.map((c) => c.id) } },
    include: { transactions: { select: { monto: true } } },
  });

  const summaries: ClientBillingSummary[] = [];
  const statusUpdates: { clientId: string; estatus: PaymentStatus }[] = [];

  for (const billing of billings) {
    const client = eligibleClients.find((c) => c.id === billing.clientId)!;
    const montoPagado = billing.transactions.reduce((sum, t) => sum + Number(t.monto), 0);
    const montoEsperado = Number(billing.montoEsperado);
    const saldoPendiente = Math.max(montoEsperado - montoPagado, 0);
    const cutoffDay = client.diaCobro ?? DEFAULT_CUTOFF_DAY;

    const estatus: PaymentStatus =
      saldoPendiente <= 0 ? "AL_DIA" : today > cutoffDay ? "VENCIDO" : "PENDIENTE";

    summaries.push({ clientId: client.id, anio, mes, montoEsperado, montoPagado, saldoPendiente, estatus });
    if (estatus !== client.estatusPago) statusUpdates.push({ clientId: client.id, estatus });
  }

  // Clientes cuyo contrato aún no arranca este mes: no se les debe nada
  // todavía, así que se quedan "Al día" sin generarles cargo.
  for (const client of notStartedClients) {
    if (client.estatusPago !== "AL_DIA") statusUpdates.push({ clientId: client.id, estatus: "AL_DIA" });
  }

  if (statusUpdates.length > 0) {
    await prisma.$transaction(
      statusUpdates.map((u) =>
        prisma.client.update({ where: { id: u.clientId }, data: { estatusPago: u.estatus } })
      )
    );
  }

  return summaries;
});
