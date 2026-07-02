"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/actions/clients";
import { deleteCategory, updateCategory } from "@/actions/categories";

export interface CategoryWithCount {
  id: string;
  name: string;
  clientCount: number;
}

interface CategoryManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCount[];
}

export function CategoryManagerDrawer({ open, onOpenChange, categories }: CategoryManagerDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");

  function startEditing(category: CategoryWithCount) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function handleRename() {
    if (!editingId || !editingName.trim()) return;
    startTransition(async () => {
      await updateCategory({ categoryId: editingId, name: editingName.trim() });
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(category: CategoryWithCount) {
    const confirmMessage =
      category.clientCount > 0
        ? `"${category.name}" tiene ${category.clientCount} cliente(s) asignado(s). Se quedarán sin categoría. ¿Eliminar de todas formas?`
        : `¿Eliminar la categoría "${category.name}"?`;
    if (!window.confirm(confirmMessage)) return;

    startTransition(async () => {
      await deleteCategory(category.id);
      router.refresh();
    });
  }

  function handleCreate() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      await createCategory({ name: newCategoryName.trim() });
      setNewCategoryName("");
      router.refresh();
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Gestionar categorías"
      description="Renombra o elimina las categorías de tus clientes"
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nueva categoría, ej. Restaurante"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          />
          <Button type="button" onClick={handleCreate} disabled={isPending} className="gap-1">
            <PlusIcon className="size-4" />
            Agregar
          </Button>
        </div>

        <ul className="divide-y rounded-xl border">
          {categories.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">Aún no hay categorías.</li>
          )}
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2 p-3">
              {editingId === category.id ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.clientCount} cliente{category.clientCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => startEditing(category)}>
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(category)}
                    disabled={isPending}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AppDrawer>
  );
}
