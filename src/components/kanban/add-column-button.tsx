"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createPipelineStatus } from "@/actions/pipeline-statuses";
import { COLOR_PALETTE } from "@/lib/pipeline-status";

/**
 * Placeholder al final del Tablero para crear un estatus/columna sin abrir
 * el drawer completo de "Gestionar estatus" — mismo atajo que ofrecen Trello
 * y herramientas similares. Ese drawer sigue siendo necesario para
 * renombrar/recolorear/eliminar los que ya existen.
 */
export function AddColumnButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(COLOR_PALETTE[0]);

  function reset() {
    setOpen(false);
    setName("");
    setColor(COLOR_PALETTE[0]);
  }

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createPipelineStatus({ nombre: name.trim(), color, esFinal: false });
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-[82vw] shrink-0 snap-start items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground sm:w-72 md:w-80"
      >
        <PlusIcon className="size-4" />
        Agregar columna
      </button>
    );
  }

  return (
    <div className="w-[82vw] shrink-0 snap-start space-y-3 rounded-2xl border bg-muted/40 p-3 sm:w-72 md:w-80">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") reset();
        }}
        placeholder="Nombre del estatus, ej. En diseño"
      />
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => setColor(hex)}
            aria-label={`Color ${hex}`}
            className={cn(
              "size-6 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
              color === hex && "ring-2 ring-foreground"
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={isPending || !name.trim()}>
          Agregar
        </Button>
      </div>
    </div>
  );
}
