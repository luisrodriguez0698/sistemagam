"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-provider";
import {
  createPipelineStatus,
  deletePipelineStatus,
  reorderPipelineStatuses,
  updatePipelineStatus,
} from "@/actions/pipeline-statuses";
import { COLOR_PALETTE, type PipelineStatusOption } from "@/lib/pipeline-status";

interface StatusManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: PipelineStatusOption[];
}

export function StatusManagerDrawer({ open, onOpenChange, statuses }: StatusManagerDrawerProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [editingColor, setEditingColor] = React.useState(COLOR_PALETTE[0]);
  const [editingFinal, setEditingFinal] = React.useState(false);

  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState(COLOR_PALETTE[0]);
  const [newFinal, setNewFinal] = React.useState(false);

  const ordered = [...statuses].sort((a, b) => a.orden - b.orden);

  function startEditing(status: PipelineStatusOption) {
    setEditingId(status.id);
    setEditingName(status.nombre);
    setEditingColor(status.color);
    setEditingFinal(status.esFinal);
  }

  function handleRename() {
    if (!editingId || !editingName.trim()) return;
    startTransition(async () => {
      await updatePipelineStatus({
        statusId: editingId,
        nombre: editingName.trim(),
        color: editingColor,
        esFinal: editingFinal,
      });
      setEditingId(null);
      router.refresh();
    });
  }

  async function handleDelete(status: PipelineStatusOption) {
    const ok = await confirm({
      title: `¿Eliminar el estatus "${status.nombre}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      await deletePipelineStatus(status.id);
      router.refresh();
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createPipelineStatus({ nombre: newName.trim(), color: newColor, esFinal: newFinal });
      setNewName("");
      setNewColor(COLOR_PALETTE[0]);
      setNewFinal(false);
      setCreating(false);
      router.refresh();
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const reordered = [...ordered];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    startTransition(async () => {
      await reorderPipelineStatuses({ orderedIds: reordered.map((s) => s.id) });
      router.refresh();
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Gestionar estatus"
      description="Crea columnas nuevas para tu Tablero, o renombra/recolorea/reordena las que ya existen"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {creating ? (
          <div className="space-y-3 rounded-xl border p-3">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del estatus, ej. En diseño"
            />
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewColor(hex)}
                  aria-label={`Color ${hex}`}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                    newColor === hex && "ring-2 ring-foreground"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={newFinal} onCheckedChange={setNewFinal} />
              Contar como &quot;completado&quot; en el resumen del dashboard
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                Agregar
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full gap-1.5" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" />
            Nuevo estatus
          </Button>
        )}

        <ul className="divide-y rounded-xl border">
          {ordered.map((status, index) => (
            <li key={status.id} className="space-y-2 p-3">
              {editingId === status.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="size-8" onClick={handleRename} disabled={isPending}>
                      <CheckIcon className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(null)}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setEditingColor(hex)}
                        aria-label={`Color ${hex}`}
                        className={cn(
                          "size-6 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                          editingColor === hex && "ring-2 ring-foreground"
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={editingFinal} onCheckedChange={setEditingFinal} />
                    Contar como &quot;completado&quot; en el resumen del dashboard
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{status.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.esDefault ? "Original" : "Personalizado"}
                      {status.esFinal ? " · cuenta como completado" : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => handleMove(index, -1)}
                    disabled={isPending || index === 0}
                  >
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => handleMove(index, 1)}
                    disabled={isPending || index === ordered.length - 1}
                  >
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => startEditing(status)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(status)}
                    disabled={isPending || status.esDefault}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AppDrawer>
  );
}
