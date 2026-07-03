import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { ensurePaymentStatusesFresh } from "@/lib/payment-status";
import { ClientList, type ClientCardData } from "@/components/clients/client-list";

export default async function ClientesPage() {
  const { agencyId } = await getTenantSession();
  const billingSummaries = await ensurePaymentStatusesFresh(agencyId);
  const saldoPorCliente = new Map(billingSummaries.map((s) => [s.clientId, s.saldoPendiente]));

  const [clients, categories] = await Promise.all([
    prisma.client.findMany({
      where: { agencyId, activo: true },
      include: { category: { select: { id: true, name: true } }, deliverableConfig: true },
      orderBy: { nombreNegocio: "asc" },
    }),
    prisma.category.findMany({
      where: { agencyId },
      select: { id: true, name: true, _count: { select: { clients: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const clientCards: ClientCardData[] = clients.map((c) => ({
    id: c.id,
    nombreNegocio: c.nombreNegocio,
    contacto: c.contacto,
    telefono: c.telefono,
    email: c.email,
    totalMensualidad: Number(c.totalMensualidad),
    diaCobro: c.diaCobro,
    fechaContratacion: c.fechaContratacion.toISOString(),
    estatusPago: c.estatusPago,
    activo: c.activo,
    categoryId: c.categoryId,
    categoryName: c.category?.name ?? null,
    videosMensuales: c.deliverableConfig.find((d) => d.tipo === "VIDEO")?.cantidadMensual ?? 0,
    disenosMensuales: c.deliverableConfig.find((d) => d.tipo === "DISENO")?.cantidadMensual ?? 0,
    saldoPendiente: saldoPorCliente.get(c.id) ?? 0,
    colorHex: c.colorHex,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Administra tus clientes por categoría y su contrato de entregables mensuales.
        </p>
      </div>
      <ClientList
        clients={clientCards}
        categories={categories.map((c) => ({ id: c.id, name: c.name, clientCount: c._count.clients }))}
      />
    </div>
  );
}
