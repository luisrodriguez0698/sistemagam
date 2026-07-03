"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, usePathname } from "next/navigation";
import { ImageIcon, VideoIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { TIPO_ACCENT } from "@/lib/deliverable-tipo";
import { cn } from "@/lib/utils";
import type { CalendarDeliverableData } from "./month-calendar";
import type { DeliverableStatus } from "@prisma/client";

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  EN_PROCESO: "En proceso",
  REVISION_CLIENTE: "Revisión",
  APROBADO: "Aprobado",
  PUBLICADO: "Publicado",
};

const STATUS_STYLE: Record<DeliverableStatus, string> = {
  EN_PROCESO: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  REVISION_CLIENTE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APROBADO: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PUBLICADO: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

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
        {deliverables.map((d) => (
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
              {d.tipo === "VIDEO" ? <VideoIcon className="size-3.5" /> : <ImageIcon className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{d.clienteNombre}</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[d.estado])}>
              {STATUS_LABEL[d.estado]}
            </span>
          </button>
        ))}
      </div>
    </AppDrawer>
  );
}
