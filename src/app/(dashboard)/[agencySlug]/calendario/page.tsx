import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { MonthCalendar, type CalendarEventData, type CalendarDeliverableData } from "@/components/calendar/month-calendar";

interface CalendarioPageProps {
  searchParams: Promise<{ month?: string }>; // formato YYYY-MM
}

export default async function CalendarioPage({ searchParams }: CalendarioPageProps) {
  const { agencyId } = await getTenantSession();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  const [year, month] = (monthParam ?? `${now.getFullYear()}-${now.getMonth() + 1}`)
    .split("-")
    .map(Number);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  // `fechaEntrega` se guarda como medianoche UTC (ver src/lib/date-only.ts);
  // los límites del mes para esta consulta se calculan también en UTC para
  // no cortar el día 1 o el último día por el desfase de huso horario.
  const monthStartUTC = new Date(Date.UTC(year, month - 1, 1));
  const monthEndUTC = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [events, deliverables, clients] = await Promise.all([
    prisma.event.findMany({
      where: { agencyId, fechaInicio: { gte: monthStart, lte: monthEnd } },
      include: { client: { select: { nombreNegocio: true } } },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.deliverable.findMany({
      where: { agencyId, fechaEntrega: { gte: monthStartUTC, lte: monthEndUTC } },
      include: { client: { select: { nombreNegocio: true } } },
      orderBy: { fechaEntrega: "asc" },
    }),
    prisma.client.findMany({
      where: { agencyId, activo: true },
      select: { id: true, nombreNegocio: true },
      orderBy: { nombreNegocio: "asc" },
    }),
  ]);

  const calendarEvents: CalendarEventData[] = events.map((ev) => ({
    id: ev.id,
    titulo: ev.titulo,
    tipo: ev.tipo,
    fechaInicio: ev.fechaInicio.toISOString(),
    fechaFin: ev.fechaFin.toISOString(),
    notas: ev.notas,
    clientId: ev.clientId,
    clienteNombre: ev.client?.nombreNegocio ?? null,
  }));

  const calendarDeliverables: CalendarDeliverableData[] = deliverables.map((d) => ({
    id: d.id,
    titulo: d.titulo,
    tipo: d.tipo,
    estado: d.estado,
    fechaEntrega: d.fechaEntrega!.toISOString(),
    clientId: d.clientId,
    clienteNombre: d.client.nombreNegocio,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Reuniones, sesiones de fotos y grabación. Click en un día para agregar un evento.
        </p>
      </div>
      <MonthCalendar
        year={year}
        month={month}
        events={calendarEvents}
        deliverables={calendarDeliverables}
        clients={clients}
      />
    </div>
  );
}
