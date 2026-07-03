import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { ensurePaymentStatusesFresh, getOutstandingBalances } from "@/lib/payment-status";
import { FinanceView } from "@/components/finance/finance-view";
import type { Prisma, TransactionType } from "@prisma/client";

const PAGE_SIZE = 15;

interface FinanzasPageProps {
  searchParams: Promise<{ page?: string; from?: string; to?: string; tipo?: string }>;
}

export default async function FinanzasPage({ searchParams }: FinanzasPageProps) {
  const { agencyId } = await getTenantSession();
  const billingSummaries = await ensurePaymentStatusesFresh(agencyId);
  const outstandingBalances = await getOutstandingBalances(agencyId);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const tipo = params.tipo === "INGRESO" || params.tipo === "GASTO" ? (params.tipo as TransactionType) : undefined;

  const where: Prisma.TransactionWhereInput = {
    agencyId,
    ...(tipo ? { tipo } : {}),
    ...(params.from || params.to
      ? {
          fecha: {
            ...(params.from ? { gte: startOfDay(new Date(`${params.from}T00:00:00`)) } : {}),
            ...(params.to ? { lte: endOfDay(new Date(`${params.to}T00:00:00`)) } : {}),
          },
        }
      : {}),
  };

  const [bankAccounts, transactions, totalCount, clients] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { agencyId, activa: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where,
      include: { bankAccount: { select: { nombreBanco: true } }, client: { select: { nombreNegocio: true } } },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where }),
    prisma.client.findMany({
      where: { agencyId, activo: true },
      select: { id: true, nombreNegocio: true },
      orderBy: { nombreNegocio: "asc" },
    }),
  ]);

  return (
    <FinanceView
      bankAccounts={bankAccounts.map((a) => ({
        id: a.id,
        nombreBanco: a.nombreBanco,
        saldoActual: Number(a.saldoActual),
      }))}
      transactions={transactions.map((t) => ({
        id: t.id,
        tipo: t.tipo,
        monto: Number(t.monto),
        concepto: t.concepto,
        categoriaGasto: t.categoriaGasto,
        fecha: t.fecha.toISOString(),
        bankAccountId: t.bankAccountId,
        bankAccountName: t.bankAccount.nombreBanco,
        clientId: t.clientId,
        clienteNombre: t.client?.nombreNegocio ?? null,
      }))}
      clients={clients}
      clientBalances={billingSummaries.map((s) => ({
        clientId: s.clientId,
        anio: s.anio,
        mes: s.mes,
        saldoPendiente: s.saldoPendiente,
      }))}
      outstandingBalances={outstandingBalances}
      pagination={{ page, pageSize: PAGE_SIZE, totalCount }}
      filters={{ from: params.from ?? "", to: params.to ?? "", tipo: params.tipo ?? "" }}
    />
  );
}
