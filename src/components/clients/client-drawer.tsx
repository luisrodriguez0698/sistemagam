"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, createCategory, updateClient } from "@/actions/clients";
import type { ClientCardData } from "./client-list";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// Paleta curada de colores bien distinguibles entre sí (incluso en modo
// oscuro) para identificar de un vistazo las tarjetas de cada cliente en
// el Kanban. El usuario elige uno al crear/editar el cliente.
const COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
];

interface CategoryOption {
  id: string;
  name: string;
}

interface ClientDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientCardData | null;
  categories: CategoryOption[];
}

export function ClientDrawer({ open, onOpenChange, client, categories }: ClientDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [nombreNegocio, setNombreNegocio] = React.useState("");
  const [contacto, setContacto] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [totalMensualidad, setTotalMensualidad] = React.useState("");
  const [diaCobro, setDiaCobro] = React.useState("");
  const [fechaContratacion, setFechaContratacion] = React.useState(todayInputValue());
  const [categoryId, setCategoryId] = React.useState("");
  const [videosMensuales, setVideosMensuales] = React.useState("4");
  const [disenosMensuales, setDisenosMensuales] = React.useState("4");
  const [colorHex, setColorHex] = React.useState(COLOR_PALETTE[0]);

  const [creatingCategory, setCreatingCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");

  const isEditing = !!client;

  React.useEffect(() => {
    if (client) {
      setNombreNegocio(client.nombreNegocio);
      setContacto(client.contacto ?? "");
      setTelefono(client.telefono ?? "");
      setEmail(client.email ?? "");
      setTotalMensualidad(String(client.totalMensualidad));
      setDiaCobro(client.diaCobro ? String(client.diaCobro) : "");
      setFechaContratacion(client.fechaContratacion.slice(0, 10));
      setCategoryId(client.categoryId ?? "");
      setVideosMensuales(String(client.videosMensuales));
      setDisenosMensuales(String(client.disenosMensuales));
      setColorHex(client.colorHex);
    } else {
      setNombreNegocio("");
      setContacto("");
      setTelefono("");
      setEmail("");
      setTotalMensualidad("");
      setDiaCobro("");
      setFechaContratacion(todayInputValue());
      setCategoryId("");
      setVideosMensuales("4");
      setDisenosMensuales("4");
      setColorHex(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    }
    setCreatingCategory(false);
    setNewCategoryName("");
  }, [client, open]);

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      const category = await createCategory({ name: newCategoryName.trim() });
      setCategoryId(category.id);
      setCreatingCategory(false);
      setNewCategoryName("");
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          nombreNegocio,
          contacto: contacto || undefined,
          telefono: telefono || undefined,
          email: email || undefined,
          totalMensualidad: Number(totalMensualidad),
          diaCobro: diaCobro ? Number(diaCobro) : undefined,
          fechaContratacion: new Date(`${fechaContratacion}T12:00:00`),
          categoryId: categoryId || undefined,
          videosMensuales: Number(videosMensuales),
          disenosMensuales: Number(disenosMensuales),
          colorHex,
        };

        if (isEditing) {
          await updateClient({ clientId: client!.id, ...payload });
        } else {
          await createClient(payload);
        }

        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al guardar el cliente");
      }
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar cliente" : "Nuevo cliente"}
      description="Datos de contacto, mensualidad y contrato de entregables"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="nombreNegocio">Nombre del negocio</Label>
          <Input
            id="nombreNegocio"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contacto">Contacto</Label>
            <Input id="contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Categoría</Label>
          {creatingCategory ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej. Cafetería"
              />
              <Button type="button" onClick={handleCreateCategory} disabled={isPending}>
                Agregar
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreatingCategory(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setCreatingCategory(true)}>
                <PlusIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Color en el tablero</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColorHex(hex)}
                aria-label={`Color ${hex}`}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                  colorHex === hex && "ring-2 ring-foreground"
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ayuda a identificar de un vistazo sus tarjetas en el tablero de entregables.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="totalMensualidad">Mensualidad</Label>
            <Input
              id="totalMensualidad"
              type="number"
              min="0"
              step="0.01"
              value={totalMensualidad}
              onChange={(e) => setTotalMensualidad(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diaCobro">Día de cobro (opcional)</Label>
            <Input
              id="diaCobro"
              type="number"
              min="1"
              max="31"
              value={diaCobro}
              onChange={(e) => setDiaCobro(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fechaContratacion">Fecha de contratación</Label>
          <Input
            id="fechaContratacion"
            type="date"
            value={fechaContratacion}
            onChange={(e) => setFechaContratacion(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Desde qué mes se le empieza a cobrar la mensualidad (no se le pedirán pagos de meses anteriores).
          </p>
        </div>

        <div className="rounded-xl border p-3">
          <p className="mb-2 text-sm font-medium">Entregables incluidos por mes</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="videosMensuales">Videos</Label>
              <Input
                id="videosMensuales"
                type="number"
                min="0"
                value={videosMensuales}
                onChange={(e) => setVideosMensuales(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disenosMensuales">Diseños</Label>
              <Input
                id="disenosMensuales"
                type="number"
                min="0"
                value={disenosMensuales}
                onChange={(e) => setDisenosMensuales(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cliente"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
