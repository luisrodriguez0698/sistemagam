import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { EntregablesView } from "@/components/kanban/entregables-view";
import type { BankAccountOption, DeliverableCardData } from "@/components/kanban/kanban-board";
import type { ClientQuota } from "@/components/kanban/deliverables-table";

interface EntregablesPageProps {
  searchParams: Promise<{ month?: string }>; // formato YYYY-MM
}

export default async function EntregablesPage({ searchParams }: EntregablesPageProps) {
  const { agencyId } = await getTenantSession();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  const [year, month] = (monthParam ?? `${now.getFullYear()}-${now.getMonth() + 1}`)
    .split("-")
    .map(Number);

  const [deliverables, clients, bankAccounts] = await Promise.all([
    prisma.deliverable.findMany({
      where: { agencyId, anio: year, mes: month },
      orderBy: { orden: "asc" },
      include: {
        client: { select: { nombreNegocio: true, colorHex: true } },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.client.findMany({
      where: { agencyId, activo: true },
      include: { deliverableConfig: true },
      orderBy: { nombreNegocio: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { agencyId, activa: true },
      select: { id: true, nombreBanco: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cards: DeliverableCardData[] = deliverables.map((d) => ({
    id: d.id,
    titulo: d.titulo,
    descripcion: d.descripcion,
    tipo: d.tipo,
    estado: d.estado,
    fechaEntrega: d.fechaEntrega?.toISOString() ?? null,
    clientId: d.clientId,
    clienteNombre: d.client.nombreNegocio,
    clienteColor: d.client.colorHex,
    linkEjemplo: d.linkEjemplo,
    archivoUrl: d.archivoUrl,
    copy: d.copy,
    orden: d.orden,
    esExtra: d.esExtra,
    montoExtra: d.montoExtra ? Number(d.montoExtra) : null,
    estatusPagoExtra: d.estatusPagoExtra,
    hasPaymentTransaction: d._count.transactions > 0,
    updatedAt: d.updatedAt.toISOString(),
  }));

  const clientQuotas: ClientQuota[] = clients.map((c) => ({
    id: c.id,
    nombreNegocio: c.nombreNegocio,
    colorHex: c.colorHex,
    videosMensuales: c.deliverableConfig.find((cfg) => cfg.tipo === "VIDEO")?.cantidadMensual ?? 0,
    disenosMensuales: c.deliverableConfig.find((cfg) => cfg.tipo === "DISENO")?.cantidadMensual ?? 0,
  }));

  const bankAccountOptions: BankAccountOption[] = bankAccounts.map((a) => ({
    id: a.id,
    nombreBanco: a.nombreBanco,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Entregables</h1>
        <p className="text-sm text-muted-foreground">
          Cambia de mes para ver su parrilla de contenido; arrastra las tarjetas del tablero para actualizar su estatus.
        </p>
      </div>
      <EntregablesView
        year={year}
        month={month}
        deliverables={cards}
        clients={clientQuotas}
        bankAccounts={bankAccountOptions}
      />
    </div>
  );
}
