"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createCampaign } from "@/actions/campaigns";
import { CampaignPayer } from "@prisma/client";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: string;
  nombreNegocio: string;
}

export interface CampaignDeliverableOption {
  id: string;
  titulo: string;
  clientId: string;
  anio: number;
  mes: number;
}

interface BankAccountOption {
  id: string;
  nombreBanco: string;
}

const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

interface CampaignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  deliverables: CampaignDeliverableOption[];
  bankAccounts: BankAccountOption[];
  onSaved?: () => void;
}

export function CampaignDrawer({
  open,
  onOpenChange,
  clients,
  deliverables,
  bankAccounts,
  onSaved,
}: CampaignDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [clientId, setClientId] = React.useState("");
  const [deliverableId, setDeliverableId] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [montoInvertido, setMontoInvertido] = React.useState("");
  const [fecha, setFecha] = React.useState(todayInputValue());
  const [pagadoPor, setPagadoPor] = React.useState<CampaignPayer>("AGENCIA");
  const [bankAccountId, setBankAccountId] = React.useState("");

  const clientDeliverables = deliverables.filter((d) => d.clientId === clientId);

  React.useEffect(() => {
    if (!open) return;
    setClientId("");
    setDeliverableId("");
    setNombre("");
    setMontoInvertido("");
    setFecha(todayInputValue());
    setPagadoPor("AGENCIA");
    setBankAccountId("");
    setError(null);
  }, [open]);

  function handleClientChange(value: string) {
    setClientId(value);
    setDeliverableId(""); // el entregable elegido antes ya no aplica a otro cliente
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pagadoPor === "AGENCIA" && !bankAccountId) {
      setError("Selecciona la cuenta bancaria de la que se descuenta la inversión");
      return;
    }

    startTransition(async () => {
      try {
        await createCampaign({
          clientId,
          deliverableId: deliverableId || undefined,
          nombre,
          montoInvertido: Number(montoInvertido),
          pagadoPor,
          fecha: new Date(`${fecha}T12:00:00`),
          bankAccountId: pagadoPor === "AGENCIA" ? bankAccountId : undefined,
        });
        onOpenChange(false);
        onSaved?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al registrar la campaña");
      }
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva campaña"
      description="Registra la inversión publicitaria de un cliente"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <SearchableSelect
            value={clientId}
            onValueChange={handleClientChange}
            options={clients.map((c) => ({ value: c.id, label: c.nombreNegocio }))}
            placeholder="Selecciona un cliente"
            searchPlaceholder="Buscar cliente..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Entregable / creativo usado (opcional)</Label>
          <SearchableSelect
            value={deliverableId}
            onValueChange={setDeliverableId}
            options={clientDeliverables.map((d) => ({
              value: d.id,
              label: `${MONTH_LABEL[d.mes - 1]} ${d.anio} · ${d.titulo}`,
            }))}
            placeholder={clientId ? "Sin entregable vinculado" : "Elige un cliente primero"}
            searchPlaceholder="Buscar entregable..."
            disabled={!clientId}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre de la campaña</Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Promo Mundial 2026"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="montoInvertido">Monto invertido</Label>
            <Input
              id="montoInvertido"
              type="number"
              min="0"
              step="0.01"
              value={montoInvertido}
              onChange={(e) => setMontoInvertido(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <DatePicker value={fecha} onChange={setFecha} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>¿Quién paga la inversión?</Label>
          <div className="flex rounded-lg border p-0.5">
            {(["AGENCIA", "CLIENTE"] as CampaignPayer[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPagadoPor(value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pagadoPor === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {value === "AGENCIA" ? "Agencia (mi cartera)" : "Cliente (su tarjeta)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {pagadoPor === "AGENCIA"
              ? "Se registrará como gasto y se descontará de la cuenta que elijas."
              : "Solo queda como registro informativo — no se toca ninguna cuenta bancaria."}
          </p>
        </div>

        {pagadoPor === "AGENCIA" && (
          <div className="space-y-1.5">
            <Label>Cuenta bancaria</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.nombreBanco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || !clientId}>
            {isPending ? "Guardando..." : "Registrar campaña"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
