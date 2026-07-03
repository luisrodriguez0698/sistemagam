"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateMonthlyDeliverables } from "@/actions/deliverables";
import type { ClientQuota } from "./deliverables-table";
import type { DeliverableCardData } from "./kanban-board";

interface GenerateDeliverablesButtonProps {
  anio: number;
  mes: number;
  clients: ClientQuota[];
  deliverables: DeliverableCardData[];
}

/**
 * Antes este botón generaba de un click todos los entregables pendientes de
 * TODOS los clientes sin mostrar nada — daba la impresión de que podía
 * "romper" lo ya generado (no es así: la Server Action solo completa lo que
 * falta por cliente/tipo, nunca borra ni duplica). Este Drawer existe para
 * dar visibilidad de ESO antes de ejecutarlo: qué cliente ya está completo
 * (no seleccionable, no hay nada que generar) y cuáles tienen pendientes,
 * dejando elegir a cuáles aplicar.
 */
export function GenerateDeliverablesButton({ anio, mes, clients, deliverables }: GenerateDeliverablesButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [message, setMessage] = React.useState<string | null>(null);

  const rows = React.useMemo(() => {
    return clients
      .map((client) => {
        const items = deliverables.filter((d) => d.clientId === client.id && !d.esExtra);
        const videosActuales = items.filter((d) => d.tipo === "VIDEO").length;
        const disenosActuales = items.filter((d) => d.tipo === "DISENO").length;
        const pendientesVideo = Math.max(0, client.videosMensuales - videosActuales);
        const pendientesDiseno = Math.max(0, client.disenosMensuales - disenosActuales);
        const sinCuota = client.videosMensuales === 0 && client.disenosMensuales === 0;
        const completo = !sinCuota && pendientesVideo === 0 && pendientesDiseno === 0;
        return {
          client,
          videosActuales,
          disenosActuales,
          pendientesVideo,
          pendientesDiseno,
          sinCuota,
          completo,
          seleccionable: !completo && !sinCuota,
        };
      })
      .sort((a, b) => a.client.nombreNegocio.localeCompare(b.client.nombreNegocio));
  }, [clients, deliverables]);

  const pendingCount = rows.filter((r) => r.seleccionable).length;

  function handleOpen() {
    setMessage(null);
    setSelected(new Set(rows.filter((r) => r.seleccionable).map((r) => r.client.id)));
    setOpen(true);
  }

  function toggle(clientId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const { created } = await generateMonthlyDeliverables({
        anio,
        mes,
        clientIds: [...selected],
      });
      setMessage(
        created === 0
          ? "No había nada pendiente para los clientes seleccionados."
          : `Se generaron ${created} entregable${created === 1 ? "" : "s"} nuevo${created === 1 ? "" : "s"}.`
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
          <SparklesIcon className="size-4" />
          Generar entregables del mes
          {pendingCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </Button>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>

      <AppDrawer
        open={open}
        onOpenChange={setOpen}
        title="Generar entregables del mes"
        description="Solo se crean los entregables que faltan por cliente — nunca se borran ni duplican los que ya existen."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {pendingCount === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Todos los clientes con cuota configurada ya tienen sus entregables de este mes completos.
            </p>
          ) : (
            <div className="divide-y rounded-xl border">
              {rows.map((row) => (
                <label
                  key={row.client.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    row.seleccionable ? "cursor-pointer hover:bg-muted/40" : "opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={!row.seleccionable}
                    checked={row.seleccionable && selected.has(row.client.id)}
                    onChange={() => toggle(row.client.id)}
                    className="size-4"
                    style={{ accentColor: row.client.colorHex }}
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.client.colorHex }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{row.client.nombreNegocio}</span>

                  {row.sinCuota ? (
                    <span className="shrink-0 text-xs text-muted-foreground">Sin cuota configurada</span>
                  ) : row.completo ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckIcon className="size-3" />
                      Completo
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Video {row.videosActuales}/{row.client.videosMensuales} · Diseño {row.disenosActuales}/
                      {row.client.disenosMensuales}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || selected.size === 0}
            >
              {isPending ? "Generando..." : `Generar para ${selected.size} cliente${selected.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </AppDrawer>
    </>
  );
}
