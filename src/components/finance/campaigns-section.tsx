"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteCampaign } from "@/actions/campaigns";
import { useConfirm } from "@/components/confirm-provider";
import { CampaignDrawer, type CampaignDeliverableOption } from "./campaign-drawer";
import type { CampaignPayer } from "@prisma/client";

export interface CampaignRow {
  id: string;
  nombre: string;
  clienteNombre: string;
  deliverableTitulo?: string | null;
  montoInvertido: number;
  pagadoPor: CampaignPayer;
  fecha: string; // ISO
}

interface CampaignsSectionProps {
  campaigns: CampaignRow[];
  clients: { id: string; nombreNegocio: string }[];
  deliverables: CampaignDeliverableOption[];
  bankAccounts: { id: string; nombreBanco: string }[];
}

export function CampaignsSection({ campaigns, clients, deliverables, bankAccounts }: CampaignsSectionProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  async function handleDelete(campaign: CampaignRow) {
    const ok = await confirm({
      title: `¿Eliminar la campaña "${campaign.nombre}"?`,
      description: "Esto no revierte el gasto ya registrado en Finanzas.",
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteCampaign(campaign.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Inversión publicitaria por cliente, pagada por ti o directamente por ellos.
        </p>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setDrawerOpen(true)}>
          <PlusIcon className="size-4" />
          Nueva campaña
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay campañas registradas.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div className="divide-y">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{c.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.clienteNombre}
                    {c.deliverableTitulo ? ` · ${c.deliverableTitulo}` : ""} ·{" "}
                    {new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(
                      new Date(c.fecha)
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.pagadoPor === "AGENCIA"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {c.pagadoPor === "AGENCIA" ? "Pagó agencia" : "Pagó cliente"}
                  </span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                      c.montoInvertido
                    )}
                  </span>
                  <button
                    onClick={() => handleDelete(c)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar campaña"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CampaignDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        clients={clients}
        deliverables={deliverables}
        bankAccounts={bankAccounts}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
