"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  from: string; // yyyy-MM-dd, puede venir vacío
  to: string;
}

export function DateRangeFilter({ from, to }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const appliedRange: DateRange | undefined = from
    ? { from: new Date(`${from}T12:00:00`), to: new Date(`${(to || from)}T12:00:00`) }
    : undefined;

  // `react-day-picker` en modo rango regresa {from, to} desde el PRIMER
  // clic (from === to, un rango de un solo día); solo el SEGUNDO clic lo
  // extiende. Por eso no se aplica/cierra en cada `onSelect` — se guarda en
  // un borrador local mientras el popover sigue abierto, y el usuario
  // confirma con "Aplicar" cuando ya terminó de elegir ambas puntas.
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(appliedRange);

  React.useEffect(() => {
    if (open) setDraftRange(appliedRange);
    // Solo debe re-sincronizar el borrador cuando se ABRE el popover, no en
    // cada cambio de `appliedRange` (eso pisaría lo que el usuario esté
    // seleccionando mientras está abierto).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function commit(next: DateRange | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // cambiar el filtro reinicia la paginación
    if (next?.from) {
      params.set("from", format(next.from, "yyyy-MM-dd"));
      params.set("to", format(next.to ?? next.from, "yyyy-MM-dd"));
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleApply() {
    commit(draftRange);
    setOpen(false);
  }

  function handleClear() {
    setDraftRange(undefined);
    commit(undefined);
    setOpen(false);
  }

  const label = !appliedRange?.from
    ? "Rango de fechas"
    : !appliedRange.to || appliedRange.from.getTime() === appliedRange.to.getTime()
      ? format(appliedRange.from, "d MMM", { locale: es })
      : `${format(appliedRange.from, "d MMM", { locale: es })} – ${format(appliedRange.to, "d MMM", { locale: es })}`;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarIcon className="size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={draftRange}
            onSelect={setDraftRange}
            defaultMonth={draftRange?.from}
            numberOfMonths={2}
            locale={es}
          />
          <div className="flex justify-end gap-2 border-t p-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Limpiar
            </Button>
            <Button type="button" size="sm" onClick={handleApply} disabled={!draftRange?.from}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {appliedRange && (
        <Button variant="ghost" size="icon" className="size-8" onClick={handleClear}>
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
