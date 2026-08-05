"use client";

import * as React from "react";
import { useTransition } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteDeliverable, updateDeliverableDetails } from "@/actions/deliverables";
import { ExtraPaymentStatus } from "@prisma/client";
import type { BankAccountOption, DeliverableCardData } from "./kanban-board";
import { DeliverableImageUpload } from "./deliverable-image-upload";
import { CheckIcon, CopyIcon } from "lucide-react";
import { TIPO_LABEL } from "@/lib/deliverable-tipo";
import type { PipelineStatusOption } from "@/lib/pipeline-status";
import { useConfirm } from "@/components/confirm-provider";

interface DeliverableDrawerProps {
  deliverable: DeliverableCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: DeliverableCardData) => void;
  onDeleted: (deliverableId: string) => void;
  bankAccounts: BankAccountOption[];
  statuses: PipelineStatusOption[];
}

export function DeliverableDrawer({
  deliverable,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  bankAccounts,
  statuses,
}: DeliverableDrawerProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [fechaEntrega, setFechaEntrega] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [montoExtra, setMontoExtra] = React.useState("");
  const [estatusPagoExtra, setEstatusPagoExtra] = React.useState<ExtraPaymentStatus>("PENDIENTE");
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [linkEjemplo, setLinkEjemplo] = React.useState("");
  const [copy, setCopy] = React.useState("");
  const [guion, setGuion] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  function handleCopyToClipboard() {
    if (!copy) return;
    navigator.clipboard.writeText(copy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // Depende de `open` + el ID (no del objeto `deliverable` completo): subir/
  // quitar la imagen de referencia actualiza ese objeto en el padre para
  // reflejarla al instante (ver `DeliverableImageUpload`) mientras el Drawer
  // sigue abierto, y eso NO debe repintar el resto del formulario y borrar
  // lo que el usuario ya haya escrito y no guardado. Los campos se vuelven a
  // cargar únicamente al ABRIR el Drawer (mismo entregable o uno distinto),
  // que es cuando sí queremos descartar cualquier cosa sin guardar de una
  // sesión de edición anterior.
  React.useEffect(() => {
    if (!open || !deliverable) return;
    setTitulo(deliverable.titulo);
    setDescripcion(deliverable.descripcion ?? "");
    setFechaEntrega(deliverable.fechaEntrega ? deliverable.fechaEntrega.slice(0, 10) : "");
    setStatusId(deliverable.statusId);
    setMontoExtra(deliverable.montoExtra != null ? String(deliverable.montoExtra) : "");
    setEstatusPagoExtra(deliverable.estatusPagoExtra ?? "PENDIENTE");
    setLinkEjemplo(deliverable.linkEjemplo ?? "");
    setCopy(deliverable.copy ?? "");
    setGuion(deliverable.guion ?? "");
    setBankAccountId("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deliverable?.id]);

  if (!deliverable) return null;

  // Solo se pide/registra cuenta bancaria la primera vez que se marca como
  // Pagado: si ya tiene el ingreso registrado, cambiar otros campos no debe
  // volver a pedirla ni duplicar la transacción.
  const needsBankAccount =
    deliverable.esExtra && estatusPagoExtra === "PAGADO" && !deliverable.hasPaymentTransaction;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsBankAccount && !bankAccountId) {
      setError("Selecciona la cuenta bancaria que recibió el pago");
      return;
    }

    startTransition(async () => {
      try {
        await updateDeliverableDetails({
          deliverableId: deliverable!.id,
          titulo,
          descripcion: descripcion || undefined,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : undefined,
          linkEjemplo: linkEjemplo || undefined,
          copy: copy || undefined,
          guion: deliverable!.tipo === "VIDEO" ? guion || undefined : undefined,
          statusId,
          montoExtra: deliverable!.esExtra ? Number(montoExtra) : undefined,
          estatusPagoExtra: deliverable!.esExtra ? estatusPagoExtra : undefined,
          bankAccountId: needsBankAccount ? bankAccountId : undefined,
        });
        onSaved({
          ...deliverable!,
          titulo,
          descripcion,
          fechaEntrega,
          linkEjemplo,
          copy,
          guion,
          statusId,
          montoExtra: deliverable!.esExtra ? Number(montoExtra) : deliverable!.montoExtra,
          estatusPagoExtra: deliverable!.esExtra ? estatusPagoExtra : deliverable!.estatusPagoExtra,
          hasPaymentTransaction: deliverable!.hasPaymentTransaction || needsBankAccount,
        });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al guardar el entregable");
      }
    });
  }

  async function handleDelete() {
    if (!deliverable) return;
    const ok = await confirm({
      title: `¿Eliminar "${deliverable.titulo}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteDeliverable(deliverable.id);
      onDeleted(deliverable.id);
      onOpenChange(false);
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={deliverable.titulo}
      description={`${deliverable.clienteNombre} · ${TIPO_LABEL[deliverable.tipo]}${deliverable.esExtra ? " · Extra" : ""}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fecha de entrega</Label>
            <DatePicker value={fechaEntrega} onChange={setFechaEntrega} />
          </div>

          <div className="space-y-1.5">
            <Label>Estatus</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="copy">Copy para redes (uso interno)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleCopyToClipboard}
              disabled={!copy}
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <Textarea
            id="copy"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="Texto para la publicación..."
          />
          <p className="text-xs text-muted-foreground">
            Solo se ve aquí adentro — nunca se incluye en la parrilla ni en el resumen descargable.
          </p>
        </div>

        {deliverable.tipo === "VIDEO" && (
          <div className="space-y-1.5">
            <Label htmlFor="guion">Guion del video</Label>
            <Textarea
              id="guion"
              value={guion}
              onChange={(e) => setGuion(e.target.value)}
              rows={10}
              placeholder="Gancho, contenido, cierre y CTA..."
            />
            <p className="text-xs text-muted-foreground">
              Se descarga aparte en el PDF de "Guion" — nunca en la parrilla ni en el resumen.
            </p>
          </div>
        )}

        <DeliverableImageUpload
          deliverableId={deliverable.id}
          imageUrl={deliverable.archivoUrl}
          onUploaded={(url) => onSaved({ ...deliverable, archivoUrl: url })}
          onRemoved={() => onSaved({ ...deliverable, archivoUrl: null })}
        />

        {deliverable.esExtra && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="montoExtra">Costo del extra</Label>
              <Input
                id="montoExtra"
                type="number"
                min="0"
                step="0.01"
                value={montoExtra}
                onChange={(e) => setMontoExtra(e.target.value)}
                required
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

            {deliverable.hasPaymentTransaction && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Ya registrado como ingreso en Finanzas.
              </p>
            )}

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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="destructive"
            className="mr-auto"
            onClick={handleDelete}
            disabled={isPending}
          >
            Eliminar
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
