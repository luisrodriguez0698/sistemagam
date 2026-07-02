import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { MonthCalendar, type CalendarEventData } from "@/components/calendar/month-calendar";

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

  const [events, clients] = await Promise.all([
    prisma.event.findMany({
      where: { agencyId, fechaInicio: { gte: monthStart, lte: monthEnd } },
      include: { client: { select: { nombreNegocio: true } } },
      orderBy: { fechaInicio: "asc" },
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Reuniones, sesiones de fotos y grabación. Click en un día para agregar un evento.
        </p>
      </div>
      <MonthCalendar year={year} month={month} events={calendarEvents} clients={clients} />
    </div>
  );
}
