"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventDrawer } from "./event-drawer";
import type { EventType } from "@prisma/client";

export type CalendarEventData = {
  id: string;
  titulo: string;
  tipo: EventType;
  fechaInicio: string; // ISO
  fechaFin: string; // ISO
  notas?: string | null;
  clientId?: string | null;
  clienteNombre?: string | null;
};

const TYPE_DOT: Record<EventType, string> = {
  REUNION: "bg-blue-500",
  SESION_FOTOS: "bg-amber-500",
  SESION_VIDEO: "bg-violet-500",
  OTRO: "bg-slate-400",
};

interface MonthCalendarProps {
  year: number;
  month: number; // 1-indexed
  events: CalendarEventData[];
  clients: { id: string; nombreNegocio: string }[];
}

export function MonthCalendar({ year, month, events, clients }: MonthCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEventData | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function goToMonth(date: Date) {
    router.push(`${pathname}?month=${format(date, "yyyy-MM")}`);
  }

  function openNewEvent(day: Date) {
    setSelectedEvent(null);
    setSelectedDate(day);
    setDrawerOpen(true);
  }

  function openExistingEvent(event: CalendarEventData, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {format(monthStart, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => goToMonth(addMonths(monthStart, -1))}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToMonth(addMonths(monthStart, 1))}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border text-xs font-medium text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="bg-muted/40 px-2 py-1.5 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
        {days.map((day) => {
          const dayEvents = events.filter((ev) => isSameDay(new Date(ev.fechaInicio), day));
          const outsideMonth = !isSameMonth(day, monthStart);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => openNewEvent(day)}
              className={cn(
                "flex min-h-24 flex-col gap-1 bg-background p-1.5 text-left align-top transition-colors hover:bg-muted/40 sm:min-h-28",
                outsideMonth && "bg-muted/20 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => openExistingEvent(ev, e)}
                    className="flex items-center gap-1 truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] hover:bg-muted-foreground/20"
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT[ev.tipo])} />
                    <span className="truncate">{ev.titulo}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">
                    +{dayEvents.length - 3} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <EventDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        event={selectedEvent}
        defaultDate={selectedDate}
        clients={clients}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
