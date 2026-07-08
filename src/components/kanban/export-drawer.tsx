"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIPO_ICON } from "@/lib/deliverable-tipo";
import type { DeliverableCardData } from "./kanban-board";

type DocType = "PARRILLA" | "RESUMEN" | "GUION";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "PARRILLA", label: "Parrilla" },
  { value: "RESUMEN", label: "Resumen" },
  { value: "GUION", label: "Guion" },
];

const ROUTE_SEGMENT: Record<DocType, string> = {
  PARRILLA: "parrilla",
  RESUMEN: "resumen",
  GUION: "guion",
};

const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface ExportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clienteNombre: string;
  anio: number;
  mes: number;
  deliverables: DeliverableCardData[];
}

/**
 * Reemplaza los botones sueltos "Descargar parrilla"/"Descargar resumen"
 * por un solo botón que abre esto — un panel lateral (no bottom-sheet,
 * ver AppDrawer direction="right") tipo Canva: eliges QUÉ documento y
 * CUÁLES entregables incluir, todos marcados por defecto. El Guion solo
 * tiene sentido para videos, así que ahí la lista se filtra sola.
 */
export function ExportDrawer({
  open,
  onOpenChange,
  clientId,
  clienteNombre,
  anio,
  mes,
  deliverables,
}: ExportDrawerProps) {
  const [docType, setDocType] = React.useState<DocType>("PARRILLA");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const availableItems = React.useMemo(
    () => (docType === "GUION" ? deliverables.filter((d) => d.tipo === "VIDEO") : deliverables),
    [deliverables, docType]
  );

  // Al abrir el Drawer o cambiar de tipo de documento, todo lo disponible
  // para ESE tipo queda marcado por defecto (como Canva).
  React.useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(availableItems.map((d) => d.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a abrir/cambiar de tipo, no cada vez que cambia la referencia del arreglo
  }, [open, docType]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDownload() {
    const params = new URLSearchParams({
      anio: String(anio),
      mes: String(mes),
      ids: [...selectedIds].join(","),
    });
    window.open(`/api/clientes/${clientId}/${ROUTE_SEGMENT[docType]}?${params.toString()}`, "_blank");
    onOpenChange(false);
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      title="Descargar contenido"
      description={`${clienteNombre} · ${MONTH_LABEL[mes - 1]} ${anio}`}
    >
      <div className="flex h-full flex-col">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Documento</p>
            <div className="flex rounded-lg border p-0.5">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDocType(opt.value)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    docType === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Entregables a incluir</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set(availableItems.map((d) => d.id)))}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Ninguno
                </Button>
              </div>
            </div>

            <div className="max-h-[55vh] space-y-0.5 overflow-y-auto rounded-xl border p-2">
              {availableItems.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {docType === "GUION"
                    ? "Este cliente no tiene videos este mes."
                    : "Sin entregables este mes."}
                </p>
              ) : (
                availableItems.map((item) => {
                  const TipoIcon = TIPO_ICON[item.tipo];
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="size-3.5"
                      />
                      <TipoIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.titulo}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto flex justify-end gap-2 pt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" className="gap-1.5" onClick={handleDownload} disabled={selectedIds.size === 0}>
            <DownloadIcon className="size-4" />
            Descargar
          </Button>
        </div>
      </div>
    </AppDrawer>
  );
}
