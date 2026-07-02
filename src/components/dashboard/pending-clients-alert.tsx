import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingClient {
  id: string;
  nombreNegocio: string;
  saldoPendiente: number;
  estatusPago: "PENDIENTE" | "VENCIDO";
}

export function PendingClientsAlert({ clients }: { clients: PendingClient[] }) {
  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Todos los clientes están al día con su mensualidad.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangleIcon className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Mensualidades pendientes</h3>
      </div>
      <ul className="divide-y divide-border">
        {clients.map((client) => (
          <li key={client.id} className="flex items-center justify-between py-2 text-sm">
            <span>{client.nombreNegocio}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                  client.saldoPendiente
                )}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  client.estatusPago === "VENCIDO"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {client.estatusPago === "VENCIDO" ? "Vencido" : "Pendiente"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
