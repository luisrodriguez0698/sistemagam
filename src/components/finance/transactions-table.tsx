"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontalIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangeFilter } from "./date-range-filter";
import { deleteTransaction } from "@/actions/transactions";

export interface TransactionRow {
  id: string;
  tipo: "INGRESO" | "GASTO";
  monto: number;
  concepto: string;
  categoriaGasto?: string | null;
  fecha: string; // ISO
  bankAccountId: string;
  bankAccountName: string;
  clientId?: string | null;
  clienteNombre?: string | null;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TransactionFilters {
  from: string;
  to: string;
  tipo: string;
}

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  PUBLICIDAD: "Publicidad",
  HERRAMIENTAS: "Herramientas",
  VIATICOS: "Viáticos",
  NOMINA: "Nómina",
  OTROS: "Otros",
};

interface TransactionsTableProps {
  transactions: TransactionRow[];
  pagination: PaginationInfo;
  filters: TransactionFilters;
  onEdit: (transaction: TransactionRow) => void;
}

export function TransactionsTable({ transactions, pagination, filters, onEdit }: TransactionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleTipoChange(value: string) {
    updateParams({ tipo: value === "ALL" ? undefined : value, page: undefined });
  }

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : undefined });
  }

  function handleDelete(transaction: TransactionRow) {
    if (!window.confirm(`¿Eliminar "${transaction.concepto}"? Esto también revierte el saldo de la cuenta.`)) return;
    startTransition(async () => {
      await deleteTransaction(transaction.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter from={filters.from} to={filters.to} />
        <Select value={filters.tipo || "ALL"} onValueChange={handleTipoChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="INGRESO">Ingresos</SelectItem>
            <SelectItem value="GASTO">Gastos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay movimientos con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 font-medium">Cuenta</th>
                <th className="px-4 py-2 font-medium">Categoría</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(new Date(t.fecha))}
                  </td>
                  <td className="px-4 py-2">
                    {t.concepto}
                    {t.clienteNombre && <span className="text-muted-foreground"> · {t.clienteNombre}</span>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{t.bankAccountName}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {t.categoriaGasto ? EXPENSE_CATEGORY_LABEL[t.categoriaGasto] : "—"}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2 text-right font-medium",
                      t.tipo === "INGRESO" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {t.tipo === "INGRESO" ? "+" : "-"}
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(t.monto)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(t)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(t)}
                          className="text-destructive focus:text-destructive"
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {pagination.page} de {totalPages} · {pagination.totalCount} movimientos
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page >= totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
