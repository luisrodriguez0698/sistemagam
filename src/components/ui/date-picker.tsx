"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  /** "YYYY-MM-DD", o "" si no hay fecha seleccionada. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// El valor se guarda/lee como componentes LOCALES (no UTC) del Date que da
// react-day-picker: la cuadrícula del calendario dibuja los días en hora
// local, así que usar getters locales aquí es lo que mantiene coincidiendo
// el día que se ve marcado con el día que realmente se clickeó.
function parseValueToLocalDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function localDateToValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Selector de fecha con Popover + Calendar, en vez de un `<input
 * type="date">` nativo (poco consistente entre navegadores y sin forma de
 * personalizar su estilo).
 */
export function DatePicker({ value, onChange, placeholder = "Selecciona una fecha", disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValueToLocalDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">
            {selected
              ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric" }).format(selected)
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) {
              onChange(localDateToValue(date));
              setOpen(false);
            }
          }}
        />
        {selected && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Quitar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
