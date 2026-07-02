"use client";

import * as React from "react";
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
  children,
}: AppDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "max-h-[92vh] bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
        )}
        onPointerDownOutside={(event) => {
          // Select/DropdownMenu (Radix) renderizan su popup en un portal
          // fuera del árbol del Drawer, y aun filtrando por atributo el
          // click para cerrar ESE popup puede seguir leyéndose como un
          // click "afuera" del Drawer. En vez de perseguir cada caso,
          // desactivamos por completo el cierre por click-afuera: un
          // formulario no debería cerrarse por accidente con datos sin
          // guardar de todas formas. Sigue cerrando con "Cancelar", el
          // botón de guardar, o arrastrando hacia abajo el drag handle.
          event.preventDefault();
        }}
      >
        <div
          className={cn(
            "mx-auto flex w-full flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2",
            MAX_WIDTH[maxWidth]
          )}
        >
          <DrawerHeader className="px-0">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="mt-2">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
