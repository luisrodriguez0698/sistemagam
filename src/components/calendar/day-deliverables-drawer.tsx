"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, usePathname } from "next/navigation";
import { AppDrawer } from "@/components/ui/app-drawer";
import { TIPO_ACCENT, TIPO_ICON } from "@/lib/deliverable-tipo";
import { statusBadgeStyle } from "@/lib/pipeline-status";
import { cn } from "@/lib/utils";
import type { CalendarDeliverableData } from "./month-calendar";

interface DayDeliverablesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | undefined;
  deliverables: CalendarDeliverableData[];
}

/**
 * Vista resumida ("tipo parrilla") de los entregables con fecha de entrega
 * en un día del calendario. Es solo de consulta rápida — al hacer click en
 * uno se navega a la Parrilla de ese mes para verlo/editarlo a detalle, en
 * vez de duplicar aquí el formulario completo del entregable.
 */
export function DayDeliverablesDrawer({ open, onOpenChange, date, deliverables }: DayDeliverablesDrawerProps) {
  const router = useRouter();
  const pathname = usePathname(); // .../calendario

  if (!date) return null;

  function goToParrilla(d: CalendarDeliverableData) {
    const entregablesPath = pathname.replace(/\/calendario$/, "/entregables");
    const monthParam = d.fechaEntrega.slice(0, 7); // YYYY-MM
    router.push(`${entregablesPath}?month=${monthParam}&view=table`);
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Entregables · ${format(date, "d 'de' MMMM", { locale: es })}`}
      description="Click en uno para verlo con más detalle en la parrilla"
      maxWidth="xl"
    >
      <div className="divide-y rounded-xl border">
        {deliverables.map((d) => {
          const TipoIcon = TIPO_ICON[d.tipo];
          return (
          <button
            key={d.id}
            type="button"
            onClick={() => goToParrilla(d)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                TIPO_ACCENT[d.tipo].badgeClassName
              )}
            >
              <TipoIcon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{d.clienteNombre}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              style={statusBadgeStyle(d.statusColor)}
            >
              {d.statusNombre}
            </span>
          </button>
          );
        })}
      </div>
    </AppDrawer>
  );
}
