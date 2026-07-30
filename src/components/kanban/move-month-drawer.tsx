"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPO_ICON } from "@/lib/deliverable-tipo";
import { useConfirm } from "@/components/confirm-provider";
import { moveDeliverablesToMonth } from "@/actions/deliverables";
import type { DeliverableCardData } from "./kanban-board";

const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface MoveMonthDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anio: number;
  mes: number;
  deliverables: DeliverableCardData[];
}

/**
 * Mueve entregables (todos o algunos) del mes que se está viendo a otro mes
 * — pensado como contingencia ("se atrasó todo, hay que recorrerlo a
 * agosto") en vez de tener que borrar y volver a capturar a mano. A
 * diferencia del Drawer de "Descargar" (que arranca con todo marcado, no
 * pasa nada si te equivocas), este arranca con TODO DESMARCADO — mover de
 * mes sí cambia datos reales, así que la selección debe ser deliberada.
 */
export function MoveMonthDrawer({ open, onOpenChange, anio, mes, deliverables }: MoveMonthDrawerProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [targetMes, setTargetMes] = React.useState(mes);
  const [targetAnio, setTargetAnio] = React.useState(anio);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) return;
    // Por defecto el mes siguiente al actual — el caso de uso más común
    // ("recorre todo lo de este mes al que sigue").
    const next = mes === 12 ? 1 : mes + 1;
    setTargetMes(next);
    setTargetAnio(mes === 12 ? anio + 1 : anio);
    setSelectedIds(new Set());
    setError(null);
  }, [open, anio, mes]);

  const byClient = new Map<string, DeliverableCardData[]>();
  for (const d of deliverables) {
    byClient.set(d.clientId, [...(byClient.get(d.clientId) ?? []), d]);
  }

  const isSameMonth = targetAnio === anio && targetMes === mes;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (isSameMonth) {
      setError("Elige un mes distinto al que estás viendo");
      return;
    }

    const ok = await confirm({
      title: `¿Mover ${selectedIds.size} entregable${selectedIds.size === 1 ? "" : "s"} a ${MONTH_LABEL[targetMes - 1]} ${targetAnio}?`,
      description: "Conservan su estatus, imagen, copy y guion — solo cambian de mes.",
      confirmText: "Mover",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await moveDeliverablesToMonth({
          deliverableIds: [...selectedIds],
          anio: targetAnio,
          mes: targetMes,
        });
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al mover los entregables");
      }
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      title="Mover a otro mes"
      description={`Desde ${MONTH_LABEL[mes - 1]} ${anio}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Mes destino</Label>
              <Select value={String(targetMes)} onValueChange={(v) => setTargetMes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABEL.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRightIcon className="mt-5 size-4 shrink-0 text-muted-foreground" />
            <div className="w-24 space-y-1.5">
              <Label>Año</Label>
              <Input
                type="number"
                value={targetAnio}
                onChange={(e) => setTargetAnio(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Entregables a mover</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set(deliverables.map((d) => d.id)))}
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

            <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border p-2">
              {deliverables.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Sin entregables este mes.
                </p>
              ) : (
                [...byClient.entries()].map(([clientId, items]) => (
                  <div key={clientId}>
                    <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
                      {items[0].clienteNombre}
                    </p>
                    {items.map((item) => {
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
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-auto flex justify-end gap-2 pt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending || selectedIds.size === 0}>
            {isPending ? "Moviendo..." : `Mover ${selectedIds.size || ""}`.trim()}
          </Button>
        </div>
      </div>
    </AppDrawer>
  );
}
