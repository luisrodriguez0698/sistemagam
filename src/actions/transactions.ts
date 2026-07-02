"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { ExpenseCategory, TransactionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const transactionFieldsSchema = z
  .object({
    tipo: z.nativeEnum(TransactionType),
    monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    concepto: z.string().min(1).max(200),
    bankAccountId: z.string().min(1),
    categoriaGasto: z.nativeEnum(ExpenseCategory).optional(),
    clientId: z.string().min(1).optional(), // abono de mensualidad de un cliente
    fecha: z.coerce.date().optional(),
  })
  .refine((data) => data.tipo !== "GASTO" || !!data.categoriaGasto, {
    message: "La categoría de gasto es obligatoria cuando el tipo es GASTO",
    path: ["categoriaGasto"],
  });

export type CreateTransactionInput = z.infer<typeof transactionFieldsSchema>;

/**
 * Si es un INGRESO con cliente asociado, liga (creando si hace falta) el
 * cargo mensual (ClientBilling) del MES DE LA FECHA elegida — no
 * necesariamente el mes actual — así un abono con fecha retroactiva cuenta
 * contra el mes que corresponde, no contra el mes en que se está capturando.
 */
async function resolveClientBillingId(
  tx: Prisma.TransactionClient,
  agencyId: string,
  tipo: TransactionType,
  clientId: string | undefined,
  fecha: Date
): Promise<string | undefined> {
  if (tipo !== "INGRESO" || !clientId) return undefined;

  const client = await tx.client.findFirst({ where: { id: clientId, agencyId } });
  if (!client) throw new Error("Cliente no encontrado en esta agencia");

  const billing = await tx.clientBilling.upsert({
    where: { clientId_anio_mes: { clientId, anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 } },
    create: {
      agencyId,
      clientId,
      anio: fecha.getFullYear(),
      mes: fecha.getMonth() + 1,
      montoEsperado: client.totalMensualidad,
    },
    update: {},
  });
  return billing.id;
}

function serializeTransaction<T extends { monto: Prisma.Decimal }>(t: T) {
  return { ...t, monto: Number(t.monto) };
}

/**
 * Registra un Ingreso o Gasto y ajusta el saldo de la cuenta bancaria
 * afectada de forma ATÓMICA: si cualquier paso falla, no queda una
 * transacción huérfana ni un saldo desincronizado.
 */
export async function createTransaction(input: CreateTransactionInput) {
  const { agencyId } = await getTenantSession();
  const data = transactionFieldsSchema.parse(input);

  const result = await prisma.$transaction(async (tx) => {
    const bankAccount = await tx.bankAccount.findFirst({ where: { id: data.bankAccountId, agencyId } });
    if (!bankAccount) throw new Error("Cuenta bancaria no encontrada en esta agencia");

    const delta = data.tipo === "INGRESO" ? data.monto : -data.monto;
    if (data.tipo === "GASTO" && Number(bankAccount.saldoActual) + delta < 0) {
      throw new Error("Saldo insuficiente en la cuenta seleccionada");
    }

    const fecha = data.fecha ?? new Date();
    const clientBillingId = await resolveClientBillingId(tx, agencyId, data.tipo, data.clientId, fecha);

    const transaction = await tx.transaction.create({
      data: {
        agencyId,
        bankAccountId: data.bankAccountId,
        clientId: data.clientId,
        clientBillingId,
        tipo: data.tipo,
        monto: data.monto,
        concepto: data.concepto,
        categoriaGasto: data.tipo === "GASTO" ? data.categoriaGasto : undefined,
        fecha,
      },
    });

    // Ajusta el saldo de forma atómica con `increment`/valor relativo,
    // evitando condiciones de carrera por lecturas concurrentes del saldo.
    await tx.bankAccount.update({ where: { id: data.bankAccountId }, data: { saldoActual: { increment: delta } } });

    return transaction;
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
  revalidatePath("/[agencySlug]", "page"); // KPIs del dashboard

  // Los Server Actions serializan su valor de retorno hacia el Client
  // Component que los llamó; los registros de Prisma tal cual traen campos
  // `Decimal`, que son instancias de clase y no serializables.
  return serializeTransaction(result);
}

const updateTransactionSchema = transactionFieldsSchema.and(z.object({ transactionId: z.string().min(1) }));

/**
 * Edita un movimiento existente. Revierte el efecto sobre la cuenta (y el
 * cliente/mes ligado) que tenía ANTES, y aplica el nuevo — incluso si se
 * cambió de cuenta bancaria — todo en una sola transacción atómica.
 */
export async function updateTransaction(input: z.infer<typeof updateTransactionSchema>) {
  const { agencyId } = await getTenantSession();
  const { transactionId, ...data } = updateTransactionSchema.parse(input);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, agencyId } });
    if (!existing) throw new Error("Movimiento no encontrado en esta agencia");

    const newBankAccount = await tx.bankAccount.findFirst({ where: { id: data.bankAccountId, agencyId } });
    if (!newBankAccount) throw new Error("Cuenta bancaria no encontrada en esta agencia");

    // 1) Revierte el efecto anterior sobre la cuenta que tenía antes.
    const oldDelta = existing.tipo === "INGRESO" ? Number(existing.monto) : -Number(existing.monto);
    await tx.bankAccount.update({
      where: { id: existing.bankAccountId },
      data: { saldoActual: { increment: -oldDelta } },
    });

    // 2) Calcula el nuevo efecto sobre la cuenta seleccionada ahora (puede
    // ser la misma o una distinta). Si es la misma cuenta, se relee el
    // saldo ya revertido para validar fondos suficientes en un GASTO.
    const accountForNewEffect =
      data.bankAccountId === existing.bankAccountId
        ? await tx.bankAccount.findUniqueOrThrow({ where: { id: data.bankAccountId } })
        : newBankAccount;

    const newDelta = data.tipo === "INGRESO" ? data.monto : -data.monto;
    if (data.tipo === "GASTO" && Number(accountForNewEffect.saldoActual) + newDelta < 0) {
      throw new Error("Saldo insuficiente en la cuenta seleccionada");
    }

    const fecha = data.fecha ?? existing.fecha;
    const clientBillingId = await resolveClientBillingId(tx, agencyId, data.tipo, data.clientId, fecha);

    const transaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        bankAccountId: data.bankAccountId,
        clientId: data.clientId ?? null,
        clientBillingId: clientBillingId ?? null,
        tipo: data.tipo,
        monto: data.monto,
        concepto: data.concepto,
        categoriaGasto: data.tipo === "GASTO" ? data.categoriaGasto : null,
        fecha,
      },
    });

    await tx.bankAccount.update({
      where: { id: data.bankAccountId },
      data: { saldoActual: { increment: newDelta } },
    });

    return transaction;
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
  revalidatePath("/[agencySlug]", "page");

  return serializeTransaction(result);
}

/**
 * Elimina un movimiento y revierte su efecto sobre el saldo de la cuenta.
 * Si el movimiento venía de marcar un entregable extra como "Pagado", ese
 * entregable regresa a "Pendiente" — de lo contrario quedaría mostrando un
 * pago que ya no tiene ningún respaldo contable.
 */
export async function deleteTransaction(transactionId: string) {
  const { agencyId } = await getTenantSession();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, agencyId } });
    if (!existing) throw new Error("Movimiento no encontrado en esta agencia");

    const reverseDelta = existing.tipo === "INGRESO" ? -Number(existing.monto) : Number(existing.monto);
    await tx.bankAccount.update({
      where: { id: existing.bankAccountId },
      data: { saldoActual: { increment: reverseDelta } },
    });

    if (existing.deliverableId) {
      await tx.deliverable.update({
        where: { id: existing.deliverableId },
        data: { estatusPagoExtra: "PENDIENTE" },
      });
    }

    await tx.transaction.delete({ where: { id: transactionId } });
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
  revalidatePath("/[agencySlug]/clientes", "page");
  revalidatePath("/[agencySlug]/entregables", "page");
  revalidatePath("/[agencySlug]", "page");
}
