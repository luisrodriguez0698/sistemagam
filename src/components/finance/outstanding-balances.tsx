"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OmittedBilling, OutstandingBalance } from "@/lib/payment-status";

interface OutstandingBalancesProps {
  balances: OutstandingBalance[];
  omittedBillings: OmittedBilling[];
  onRegisterPayment: (balance: OutstandingBalance) => void;
  onOmit: (balance: OutstandingBalance) => void;
  onUndoOmit: (item: OmittedBilling) => void;
}

/**
 * "Quién me debe cuánto y de qué mes" — a diferencia del badge de estatus
 * del cliente (que solo refleja el mes en curso), esto muestra CADA mes
 * con saldo pendiente, incluyendo meses anteriores ya "tapados" por un mes
 * actual al día.
 */
export function OutstandingBalances({
  balances,
  omittedBillings,
  onRegisterPayment,
  onOmit,
  onUndoOmit,
}: OutstandingBalancesProps) {
  const byClient = new Map<string, OutstandingBalance[]>();
  for (const b of balances) {
    byClient.set(b.clientId, [...(byClient.get(b.clientId) ?? []), b]);
  }

  return (
    <div className="space-y-3">
      {balances.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ningún cliente tiene saldo pendiente.
        </div>
      ) : (
        [...byClient.values()].map((rows) => {
          const total = rows.reduce((sum, r) => sum + r.saldoPendiente, 0);
          return (
            <div key={rows[0].clientId} className="overflow-hidden rounded-2xl border">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
                <p className="font-semibold">{rows[0].nombreNegocio}</p>
                <p className="text-sm font-semibold text-destructive">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total)} en total
                </p>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div
                    key={`${row.anio}-${row.mes}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="capitalize text-muted-foreground">
                      {format(new Date(row.anio, row.mes - 1, 1), "MMMM yyyy", { locale: es })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                          row.saldoPendiente
                        )}
                      </span>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onOmit(row)}>
                        Omitir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onRegisterPayment(row)}>
                        Registrar abono
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {omittedBillings.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-dashed">
          <p className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">Meses omitidos</p>
          <div className="divide-y">
            {omittedBillings.map((item) => (
              <div
                key={`${item.clientId}-${item.anio}-${item.mes}`}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {item.nombreNegocio} ·{" "}
                  <span className="capitalize">
                    {format(new Date(item.anio, item.mes - 1, 1), "MMMM yyyy", { locale: es })}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs text-muted-foreground"
                  onClick={() => onUndoOmit(item)}
                >
                  <Undo2Icon className="size-3.5" />
                  Deshacer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
