"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import type { OutstandingBalance } from "@/lib/payment-status";

interface OutstandingBalancesProps {
  balances: OutstandingBalance[];
  onRegisterPayment: (balance: OutstandingBalance) => void;
}

/**
 * "Quién me debe cuánto y de qué mes" — a diferencia del badge de estatus
 * del cliente (que solo refleja el mes en curso), esto muestra CADA mes
 * con saldo pendiente, incluyendo meses anteriores ya "tapados" por un mes
 * actual al día.
 */
export function OutstandingBalances({ balances, onRegisterPayment }: OutstandingBalancesProps) {
  if (balances.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ningún cliente tiene saldo pendiente.
      </div>
    );
  }

  const byClient = new Map<string, OutstandingBalance[]>();
  for (const b of balances) {
    byClient.set(b.clientId, [...(byClient.get(b.clientId) ?? []), b]);
  }

  return (
    <div className="space-y-3">
      {[...byClient.values()].map((rows) => {
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
                    <Button size="sm" variant="outline" onClick={() => onRegisterPayment(row)}>
                      Registrar abono
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
