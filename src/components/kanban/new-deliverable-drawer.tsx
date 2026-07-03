"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDeliverable } from "@/actions/deliverables";
import { DeliverableType, ExtraPaymentStatus } from "@prisma/client";
import { isRecurringTipo, TIPO_LABEL, TIPO_ORDER } from "@/lib/deliverable-tipo";
import type { BankAccountOption } from "./kanban-board";

interface ClientOption {
  id: string;
  nombreNegocio: string;
}

interface NewDeliverableDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  /** Cliente preseleccionado, ej. cuando se abre desde la fila de un cliente en la parrilla. */
  defaultClientId?: string;
  anio: number;
  mes: number;
  bankAccounts: BankAccountOption[];
}

export function NewDeliverableDrawer({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  anio,
  mes,
  bankAccounts,
}: NewDeliverableDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [clientId, setClientId] = React.useState(defaultClientId ?? "");
  const [tipo, setTipo] = React.useState<DeliverableType>("VIDEO");
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [fechaEntrega, setFechaEntrega] = React.useState("");
  const [linkEjemplo, setLinkEjemplo] = React.useState("");
  const [esExtra, setEsExtra] = React.useState(false);
  const [montoExtra, setMontoExtra] = React.useState("");
  const [estatusPagoExtra, setEstatusPagoExtra] = React.useState<ExtraPaymentStatus>("PENDIENTE");
  const [bankAccountId, setBankAccountId] = React.useState("");

  const needsBankAccount = esExtra && estatusPagoExtra === "PAGADO";
  // Fuera de Video/Diseño, todo es un proyecto único — nunca forma parte de
  // la cuota mensual recurrente, así que siempre se crea como "extra".
  const tipoForzaExtra = !isRecurringTipo(tipo);

  function handleTipoChange(value: DeliverableType) {
    setTipo(value);
    if (!isRecurringTipo(value)) setEsExtra(true);
  }

  React.useEffect(() => {
    if (!open) return;
    setClientId(defaultClientId ?? "");
    setTipo("VIDEO");
    setTitulo("");
    setDescripcion("");
    setFechaEntrega("");
    setLinkEjemplo("");
    setEsExtra(false);
    setMontoExtra("");
    setEstatusPagoExtra("PENDIENTE");
    setBankAccountId("");
    setError(null);
  }, [open, defaultClientId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsBankAccount && !bankAccountId) {
      setError("Selecciona la cuenta bancaria que recibió el pago");
      return;
    }

    startTransition(async () => {
      try {
        await createDeliverable({
          clientId,
          tipo,
          titulo,
          descripcion: descripcion || undefined,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : undefined,
          linkEjemplo: linkEjemplo || undefined,
          anio,
          mes,
          esExtra,
          montoExtra: esExtra ? Number(montoExtra) : undefined,
          estatusPagoExtra: esExtra ? estatusPagoExtra : undefined,
          bankAccountId: needsBankAccount ? bankAccountId : undefined,
        });
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al crear el entregable");
      }
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo entregable"
      description="Se agrega directamente a la columna 'En proceso' de ese mes"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={clientId} onValueChange={setClientId} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombreNegocio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => handleTipoChange(v as DeliverableType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TIPO_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de entrega (opcional)</Label>
            <DatePicker value={fechaEntrega} onChange={setFechaEntrega} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Notas / descripción</Label>
          <Textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkEjemplo">Link de ejemplo (opcional)</Label>
          <Input
            id="linkEjemplo"
            type="url"
            placeholder="https://..."
            value={linkEjemplo}
            onChange={(e) => setLinkEjemplo(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          La imagen de referencia se sube después de crear el entregable, desde el mismo Drawer al editarlo.
        </p>

        <div className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">Es un entregable extra (costo adicional)</p>
              <p className="text-muted-foreground">
                {tipoForzaExtra
                  ? `${TIPO_LABEL[tipo]} siempre es un proyecto único, no forma parte de la cuota mensual.`
                  : "No cuenta contra la cuota mensual del contrato de este cliente."}
              </p>
            </div>
            <Switch checked={esExtra} onCheckedChange={setEsExtra} disabled={tipoForzaExtra} />
          </div>

          {esExtra && (
            <div className="grid grid-cols-1 gap-4 border-t pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="montoExtra">Costo</Label>
                <Input
                  id="montoExtra"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={montoExtra}
                  onChange={(e) => setMontoExtra(e.target.value)}
                  required={esExtra}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Estatus de pago</Label>
                <Select
                  value={estatusPagoExtra}
                  onValueChange={(v) => setEstatusPagoExtra(v as ExtraPaymentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="PAGADO">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {needsBankAccount && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Cuenta bancaria que recibió el pago</Label>
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
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || !clientId}>
            {isPending ? "Creando..." : "Crear entregable"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
