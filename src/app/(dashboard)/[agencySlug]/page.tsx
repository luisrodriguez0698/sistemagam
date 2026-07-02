import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { BanknoteIcon, TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { ensurePaymentStatusesFresh } from "@/lib/payment-status";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ExpenseCategoryChart, type ExpenseCategorySlice } from "@/components/dashboard/expense-category-chart";
import { IncomeExpenseChart, type IncomeExpensePoint } from "@/components/dashboard/income-expense-chart";
import { PendingClientsAlert } from "@/components/dashboard/pending-clients-alert";

const currency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export default async function DashboardPage() {
  const { agencyId } = await getTenantSession();
  const billingSummaries = await ensurePaymentStatusesFresh(agencyId);
  const saldoPorCliente = new Map(billingSummaries.map((s) => [s.clientId, s.saldoPendiente]));

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    monthTotals,
    expenseByCategory,
    balanceAgg,
    deliverablesThisMonth,
    completedDeliverables,
    pendingClients,
    last6Months,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["tipo"],
      where: { agencyId, fecha: { gte: monthStart, lte: monthEnd } },
      _sum: { monto: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoriaGasto"],
      where: { agencyId, tipo: "GASTO", fecha: { gte: monthStart, lte: monthEnd } },
      _sum: { monto: true },
    }),
    prisma.bankAccount.aggregate({
      where: { agencyId, activa: true },
      _sum: { saldoActual: true },
    }),
    prisma.deliverable.count({
      where: { agencyId, fechaEntrega: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.deliverable.count({
      where: {
        agencyId,
        fechaEntrega: { gte: monthStart, lte: monthEnd },
        estado: { in: ["APROBADO", "PUBLICADO"] },
      },
    }),
    prisma.client.findMany({
      where: { agencyId, activo: true, estatusPago: { in: ["PENDIENTE", "VENCIDO"] } },
      select: { id: true, nombreNegocio: true, estatusPago: true },
      orderBy: { estatusPago: "desc" },
    }),
    Promise.all(
      Array.from({ length: 6 }, (_, i) => 5 - i).map(async (offset) => {
        const monthDate = subMonths(now, offset);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const totals = await prisma.transaction.groupBy({
          by: ["tipo"],
          where: { agencyId, fecha: { gte: start, lte: end } },
          _sum: { monto: true },
        });
        const ingresos = Number(totals.find((t) => t.tipo === "INGRESO")?._sum.monto ?? 0);
        const gastos = Number(totals.find((t) => t.tipo === "GASTO")?._sum.monto ?? 0);
        return { mes: format(monthDate, "MMM", { locale: es }), ingresos, gastos } satisfies IncomeExpensePoint;
      })
    ),
  ]);

  const ingresosMes = Number(monthTotals.find((t) => t.tipo === "INGRESO")?._sum.monto ?? 0);
  const gastosMes = Number(monthTotals.find((t) => t.tipo === "GASTO")?._sum.monto ?? 0);
  const saldoTotal = Number(balanceAgg._sum.saldoActual ?? 0);
  const porcentajeCompletados =
    deliverablesThisMonth === 0 ? 0 : Math.round((completedDeliverables / deliverablesThisMonth) * 100);

  const expenseSlices: ExpenseCategorySlice[] = expenseByCategory
    .filter((e) => e.categoriaGasto)
    .map((e) => ({ categoria: e.categoriaGasto as string, total: Number(e._sum.monto ?? 0) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen ejecutivo</h1>
        <p className="text-sm text-muted-foreground">
          {format(now, "MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingresos del mes" value={currency(ingresosMes)} icon={TrendingUpIcon} tone="positive" />
        <KpiCard label="Gastos del mes" value={currency(gastosMes)} icon={TrendingDownIcon} tone="negative" />
        <KpiCard label="Saldo total en bancos" value={currency(saldoTotal)} icon={WalletIcon} />
        <KpiCard
          label="Entregables completados"
          value={`${porcentajeCompletados}%`}
          icon={BanknoteIcon}
          hint={`${completedDeliverables} de ${deliverablesThisMonth} este mes`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Ingresos vs. gastos (últimos 6 meses)</h3>
          <IncomeExpenseChart data={last6Months} />
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Gastos por categoría (este mes)</h3>
          <ExpenseCategoryChart data={expenseSlices} />
        </div>
      </div>

      <PendingClientsAlert
        clients={pendingClients.map((c) => ({
          id: c.id,
          nombreNegocio: c.nombreNegocio,
          saldoPendiente: saldoPorCliente.get(c.id) ?? 0,
          estatusPago: c.estatusPago as "PENDIENTE" | "VENCIDO",
        }))}
      />
    </div>
  );
}
