"use client";

import * as React from "react";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClientCard } from "./client-card";
import { ClientDrawer } from "./client-drawer";
import { CategoryManagerDrawer, type CategoryWithCount } from "./category-manager-drawer";

export type ClientCardData = {
  id: string;
  nombreNegocio: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  totalMensualidad: number;
  diaCobro?: number | null;
  fechaContratacion: string; // ISO string
  estatusPago: "AL_DIA" | "PENDIENTE" | "VENCIDO";
  activo: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  videosMensuales: number;
  disenosMensuales: number;
  saldoPendiente: number;
  colorHex: string;
};

interface ClientListProps {
  clients: ClientCardData[];
  categories: CategoryWithCount[];
}

export function ClientList({ clients, categories }: ClientListProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientCardData | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);

  const filtered = clients.filter((c) =>
    selectedCategory === "ALL" ? true : c.categoryId === selectedCategory
  );

  function openNew() {
    setSelectedClient(null);
    setDrawerOpen(true);
  }

  function openEdit(client: ClientCardData) {
    setSelectedClient(client);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              selectedCategory === "ALL" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button onClick={() => setCategoryManagerOpen(true)} size="sm" variant="outline" className="gap-1">
            <SettingsIcon className="size-4" />
            Categorías
          </Button>
          <Button onClick={openNew} size="sm" className="gap-1">
            <PlusIcon className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay clientes en esta categoría todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => openEdit(client)} />
          ))}
        </div>
      )}

      <ClientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        client={selectedClient}
        categories={categories}
      />

      <CategoryManagerDrawer
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories}
      />
    </div>
  );
}
