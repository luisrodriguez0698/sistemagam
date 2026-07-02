"use client";

import { ImageIcon, PhoneIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientCardData } from "./client-list";

const STATUS_STYLE: Record<ClientCardData["estatusPago"], string> = {
  AL_DIA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PENDIENTE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  VENCIDO: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_LABEL: Record<ClientCardData["estatusPago"], string> = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
  VENCIDO: "Vencido",
};

export function ClientCard({ client, onClick }: { client: ClientCardData; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md",
        !client.activo && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{client.nombreNegocio}</p>
          {client.categoryName && (
            <p className="text-xs text-muted-foreground">{client.categoryName}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[client.estatusPago])}>
            {STATUS_LABEL[client.estatusPago]}
          </span>
          {client.estatusPago !== "AL_DIA" && client.saldoPendiente > 0 && (
            <span className="text-xs text-muted-foreground">
              Restan {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(client.saldoPendiente)}
            </span>
          )}
        </div>
      </div>

      {client.contacto && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PhoneIcon className="size-3" />
          {client.contacto} {client.telefono ? `· ${client.telefono}` : ""}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-semibold">
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(client.totalMensualidad)}
          <span className="font-normal text-muted-foreground"> /mes</span>
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <VideoIcon className="size-3" /> {client.videosMensuales}
          </span>
          <span className="flex items-center gap-1">
            <ImageIcon className="size-3" /> {client.disenosMensuales}
          </span>
        </div>
      </div>
    </button>
  );
}
