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
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={direction}>
      <DrawerContent
        direction={direction}
        className={cn(
          "bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80",
          direction === "bottom" && "max-h-[92vh]"
        )}
        onPointerDownOutside={(event) => {
          // Select/DropdownMenu/Popover (Radix) renderizan su popup en un
          // portal fuera del árbol del Drawer — un click ahí se lee como
          // "afuera" del Drawer aunque sea parte del mismo formulario, y
          // antes eso cerraba el Drawer por accidente perdiendo lo escrito.
          // Todo contenido posicionado por Radix (Select/Popover/Dropdown/
          // Calendar) comparte este wrapper interno; si el click cae ahí,
          // se ignora. Cualquier OTRO click afuera sí cierra el Drawer.
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
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
