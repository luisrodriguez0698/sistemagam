"use client";

import * as React from "react";
import { ChevronDownIcon, SearchIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DeliverableType } from "@prisma/client";

export interface ClientFilterOption {
  id: string;
  nombreNegocio: string;
  colorHex: string;
}

interface KanbanFiltersProps {
  clients: ClientFilterOption[];
  selectedClientIds: Set<string>;
  onToggleClient: (clientId: string) => void;
  onSelectAllClients: () => void;
  onSelectNoClients: () => void;
  tipoFilter: DeliverableType | "ALL";
  onTipoFilterChange: (tipo: DeliverableType | "ALL") => void;
}

const TIPO_OPTIONS: { value: DeliverableType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "VIDEO", label: "Video" },
  { value: "DISENO", label: "Diseño" },
];

/**
 * Filtros del tablero: por cliente (checklist, útil cuando hay muchos
 * clientes) y por tipo de entregable. Se aplican ocultando tarjetas con CSS
 * en vez de quitarlas del arreglo que usa dnd-kit, para no desalinear los
 * índices que usa el drag-and-drop al soltar una tarjeta.
 */
export function KanbanFilters({
  clients,
  selectedClientIds,
  onToggleClient,
  onSelectAllClients,
  onSelectNoClients,
  tipoFilter,
  onTipoFilterChange,
}: KanbanFiltersProps) {
  const [search, setSearch] = React.useState("");

  const filteredClients = clients.filter((c) =>
    c.nombreNegocio.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = selectedClientIds.size === clients.length;
  const clientLabel = allSelected
    ? "Todos los clientes"
    : selectedClientIds.size === 0
      ? "Ningún cliente"
      : `${selectedClientIds.size} de ${clients.length} clientes`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover onOpenChange={(isOpen) => !isOpen && setSearch("")}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <UsersIcon className="size-4" />
            {clientLabel}
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="relative mb-2">
            <SearchIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="h-8 pl-7 text-sm"
            />
          </div>

          <div className="mb-2 flex gap-1 border-b pb-2">
            <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={onSelectAllClients}>
              Seleccionar todos
            </Button>
            <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={onSelectNoClients}>
              Ninguno
            </Button>
          </div>

          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {filteredClients.length === 0 && (
              <p className="p-2 text-center text-xs text-muted-foreground">Sin resultados</p>
            )}
            {filteredClients.map((client) => (
              <label
                key={client.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedClientIds.has(client.id)}
                  onChange={() => onToggleClient(client.id)}
                  className="size-3.5 accent-current"
                  style={{ accentColor: client.colorHex }}
                />
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: client.colorHex }}
                  aria-hidden
                />
                <span className="truncate">{client.nombreNegocio}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex rounded-lg border p-0.5">
        {TIPO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTipoFilterChange(opt.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              tipoFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
