"use client";

import Link from "next/link";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface OverdueClientNotification {
  id: string;
  nombreNegocio: string;
  estatusPago: "PENDIENTE" | "VENCIDO";
}

interface NotificationsBellProps {
  agencySlug: string;
  clients: OverdueClientNotification[];
}

export function NotificationsBell({ agencySlug, clients }: NotificationsBellProps) {
  const hasVencidos = clients.some((c) => c.estatusPago === "VENCIDO");
  const visible = clients.slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <BellIcon className="size-4" />
          {clients.length > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                hasVencidos ? "bg-red-500" : "bg-amber-500"
              )}
            >
              {clients.length > 9 ? "9+" : clients.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Mensualidades pendientes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visible.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Todos los clientes están al día.</p>
        ) : (
          <>
            {visible.map((client) => (
              <DropdownMenuItem key={client.id} asChild>
                <Link href={`/${agencySlug}/clientes`} className="flex items-center justify-between gap-2">
                  <span className="truncate">{client.nombreNegocio}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      client.estatusPago === "VENCIDO"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {client.estatusPago === "VENCIDO" ? "Vencido" : "Pendiente"}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            {clients.length > visible.length && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                +{clients.length - visible.length} más
              </p>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
