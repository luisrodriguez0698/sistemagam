"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const MAX_WIDTH = {
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
} as const;

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
  /**
   * "right" es para paneles de selección/acción puntual (ej. elegir qué
   * descargar) — no para formularios de captura, que siguen siendo
   * siempre bottom-sheet.
   */
  direction?: "bottom" | "right";
  children: React.ReactNode;
}

/**
 * Panel único del sistema para crear/editar/ver detalle de cualquier
 * entidad (entregable del Kanban, transacción, cliente, evento, etc.).
 *
 * Se usa el MISMO Drawer (bottom sheet) en cualquier resolución: en
 * pantallas grandes no cambia a un Dialog centrado, simplemente el
 * contenido interno se acota con `max-w-*` y se centra, manteniendo
 * el drag handle y el fondo difuminado. Esto evita dos rutas de código
 * de formularios (una para desktop y otra para mobile) y mantiene la
 * cohesión visual pedida para todo el sistema.
 */
export function AppDrawer({
  open,
  onOpenChange,
  title,
  description,
  maxWidth = "2xl",
  direction = "bottom",
  children,
}: AppDrawerProps) {
  // Radix Dialog difiere su propio `onPointerDownOutside` al evento "click"
  // que sigue al pointerdown (`deferPointerDownOutside`), pero un <Select>
  // anidado NO difiere el suyo — se cierra (y desmonta su
  // `[data-radix-popper-content-wrapper]`) de inmediato, en el pointerdown
  // mismo. Para cuando nuestro handler de abajo por fin corre (en el click,
  // ya tarde), el Select ya no existe en el DOM, así que preguntarlo ahí
  // siempre da "no hay ninguno abierto" aunque sí lo hubiera al momento del
  // click real. Por eso se captura el estado ANTES, con un listener propio
  // en fase de captura (que por definición corre antes que cualquier
  // listener en fase de burbuja, sin importar el orden de montaje).
  const wasPopperOpenRef = React.useRef(false);

  React.useEffect(() => {
    function capturePopperState() {
      wasPopperOpenRef.current = document.querySelector("[data-radix-popper-content-wrapper]") != null;
    }
    document.addEventListener("pointerdown", capturePopperState, true);
    return () => document.removeEventListener("pointerdown", capturePopperState, true);
  }, []);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={direction}>
      <DrawerContent
        direction={direction}
        className={cn(
          "bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80",
          direction === "bottom" && "max-h-[92vh]"
        )}
        onPointerDownOutside={(event) => {
          // Mientras un Select/DropdownMenu/Popover (Radix) está ABIERTO,
          // Radix bloquea los pointer-events de TODO excepto su propio
          // popup — incluyendo el contenido de este Drawer. Un click en un
          // espacio vacío del formulario (con la sola intención de cerrar
          // el Select sin elegir nada) entonces no golpea el formulario
          // sino lo que sea que quede "detrás" en ese punto — en este caso
          // el overlay oscuro del propio Drawer (`data-vaul-overlay`),
          // que a propósito se deja siempre clickeable — y eso se leía
          // como "clickeaste afuera del Drawer" y lo cerraba también a él.
          // Se usa el valor capturado en el pointerdown (ver arriba), no
          // una consulta en vivo aquí — para cuando este handler corre, un
          // Select que sí estaba abierto en ese instante ya pudo haberse
          // desmontado solo.
          if (wasPopperOpenRef.current) {
            event.preventDefault();
          }
        }}
      >
        <div
          className={cn(
            "flex w-full flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2",
            direction === "bottom" ? cn("mx-auto", MAX_WIDTH[maxWidth]) : "h-full"
          )}
        >
          <DrawerHeader
            className={cn(
              "px-0",
              direction === "right" && "flex flex-row items-start justify-between gap-2 text-left"
            )}
          >
            <div className={cn(direction === "right" && "min-w-0")}>
              <DrawerTitle>{title}</DrawerTitle>
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </div>
            {direction === "right" && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </DrawerHeader>
          <div className="mt-2 flex-1">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
