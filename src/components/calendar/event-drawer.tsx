"use client";

import * as React from "react";
import { useTransition } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
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
import { createEvent, deleteEvent, updateEvent } from "@/actions/events";
import { EventType } from "@prisma/client";
import type { CalendarEventData } from "./month-calendar";

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  REUNION: "Reunión",
  SESION_FOTOS: "Sesión de fotos",
  SESION_VIDEO: "Sesión de video",
  OTRO: "Otro",
};

interface ClientOption {
  id: string;
  nombreNegocio: string;
}

interface EventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Evento a editar, o null si se está creando uno nuevo. */
  event: CalendarEventData | null;
  /** Fecha por defecto al crear un evento nuevo (día en que se hizo click). */
  defaultDate?: Date;
  clients: ClientOption[];
  onSaved: () => void;
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EventDrawer({ open, onOpenChange, event, defaultDate, clients, onSaved }: EventDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [titulo, setTitulo] = React.useState("");
  const [tipo, setTipo] = React.useState<EventType>("REUNION");
  const [fechaInicio, setFechaInicio] = React.useState("");
  const [fechaFin, setFechaFin] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [clientId, setClientId] = React.useState("");

  const isEditing = !!event;

  React.useEffect(() => {
    if (event) {
      setTitulo(event.titulo);
      setTipo(event.tipo);
      setFechaInicio(toLocalInputValue(new Date(event.fechaInicio)));
      setFechaFin(toLocalInputValue(new Date(event.fechaFin)));
      setNotas(event.notas ?? "");
      setClientId(event.clientId ?? "");
    } else {
      const base = defaultDate ?? new Date();
      const start = new Date(base);
      start.setHours(10, 0, 0, 0);
      const end = new Date(base);
      end.setHours(11, 0, 0, 0);
      setTitulo("");
      setTipo("REUNION");
      setFechaInicio(toLocalInputValue(start));
      setFechaFin(toLocalInputValue(end));
      setNotas("");
      setClientId("");
    }
  }, [event, defaultDate, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          titulo,
          tipo,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          notas: notas || undefined,
          clientId: clientId || undefined,
        };
        if (isEditing) {
          await updateEvent({ eventId: event!.id, ...payload });
        } else {
          await createEvent(payload);
        }
        onSaved();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al guardar el evento");
      }
    });
  }

  function handleDelete() {
    if (!event) return;
    startTransition(async () => {
      await deleteEvent(event.id);
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar evento" : "Nuevo evento"}
      description="Reuniones, sesiones de fotos o video"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cliente (opcional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin cliente" />
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fechaInicio">Inicio</Label>
            <Input
              id="fechaInicio"
              type="datetime-local"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fechaFin">Fin</Label>
            <Input
              id="fechaFin"
              type="datetime-local"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas</Label>
          <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          {isEditing && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={handleDelete}
              disabled={isPending}
            >
              Eliminar
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
