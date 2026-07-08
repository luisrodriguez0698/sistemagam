"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BellIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OutstandingBalance } from "@/lib/payment-status";

export interface OverdueClientNotification {
  id: string;
  nombreNegocio: string;
  estatusPago: "PENDIENTE" | "VENCIDO";
}

interface NotificationsBellProps {
  agencySlug: string;
  clients: OverdueClientNotification[];
  outstandingBalances: OutstandingBalance[];
}

/**
 * Antes esto era un dropdown chiquito con solo "Cliente · Pendiente/Vencido"
 * — sin decir de qué mes ni cuánto. Ahora abre el mismo tipo de panel
 * lateral que "Descargar" (ExportDrawer), reusando los datos de "Cuentas
 * por cobrar" de Finanzas para mostrar, por cliente, cada mes que debe y
 * su monto — de un vistazo, sin tener que entrar a Finanzas a investigar.
 */
export function NotificationsBell({ agencySlug, clients, outstandingBalances }: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const hasVencidos = clients.some((c) => c.estatusPago === "VENCIDO");
  const estatusByClient = new Map(clients.map((c) => [c.id, c.estatusPago]));

  const byClient = new Map<string, OutstandingBalance[]>();
  for (const b of outstandingBalances) {
    byClient.set(b.clientId, [...(byClient.get(b.clientId) ?? []), b]);
  }
  const groups = [...byClient.values()];

  function goToFinanzas() {
    setOpen(false);
    router.push(`/${agencySlug}/finanzas`);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notificaciones"
        onClick={() => setOpen(true)}
      >
        <BellIcon className="size-4" />
        {groups.length > 0 && (
          <span
            className={cn(
              "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              hasVencidos ? "bg-red-500" : "bg-amber-500"
            )}
          >
            {groups.length > 9 ? "9+" : groups.length}
          </span>
        )}
      </Button>

      <AppDrawer
        open={open}
        onOpenChange={setOpen}
        direction="right"
        title="Mensualidades pendientes"
        description="Cuánto debe cada cliente y de qué mes"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Todos los clientes están al día.
              </p>
            ) : (
              groups.map((rows) => {
                const total = rows.reduce((sum, r) => sum + r.saldoPendiente, 0);
                const estatus = estatusByClient.get(rows[0].clientId);
                return (
                  <div key={rows[0].clientId} className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">{rows[0].nombreNegocio}</p>
                        {estatus && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              estatus === "VENCIDO"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {estatus === "VENCIDO" ? "Vencido" : "Pendiente"}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-destructive">
                        {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total)}
                      </span>
                    </div>
                    <div className="divide-y">
                      {rows.map((row) => (
                        <div
                          key={`${row.anio}-${row.mes}`}
                          className="flex items-center justify-between px-3 py-1.5 text-xs"
                        >
                          <span className="capitalize text-muted-foreground">
                            {format(new Date(row.anio, row.mes - 1, 1), "MMMM yyyy", { locale: es })}
                          </span>
                          <span className="font-medium">
                            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                              row.saldoPendiente
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-2">
            <Button className="w-full" onClick={goToFinanzas}>
              Ir a Finanzas
            </Button>
          </div>
        </div>
      </AppDrawer>
    </>
  );
}
