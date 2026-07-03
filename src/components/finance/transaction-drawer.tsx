"use client";

import * as React from "react";
import { useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { createTransaction, deleteTransaction, updateTransaction } from "@/actions/transactions";
import { useConfirm } from "@/components/confirm-provider";
import { ExpenseCategory, TransactionType } from "@prisma/client";
import type { ClientBalance } from "./finance-view";
import type { TransactionRow } from "./transactions-table";

const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  PUBLICIDAD: "Publicidad",
  HERRAMIENTAS: "Herramientas",
  VIATICOS: "Viáticos",
  NOMINA: "Nómina",
  OTROS: "Otros",
};

interface BankAccountOption {
  id: string;
  nombreBanco: string;
}

interface ClientOption {
  id: string;
  nombreNegocio: string;
}

interface TransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: TransactionType; // tipo por defecto al crear (Registrar abono / Registrar gasto)
  bankAccounts: BankAccountOption[];
  clients?: ClientOption[]; // solo relevante cuando el tipo efectivo = INGRESO
  clientBalances?: ClientBalance[]; // saldo restante del mes en curso, por cliente
  /** Movimiento a editar; si es null/undefined, el Drawer crea uno nuevo. */
  transaction?: TransactionRow | null;
  onSaved?: () => void;
  /**
   * Valores iniciales al CREAR (ignorados si `transaction` está definido) —
   * los usa "Cuentas por cobrar" para abrir el Drawer ya listo para saldar
   * un mes específico, sin que el usuario tenga que volver a capturarlo.
   */
  defaultClientId?: string;
  defaultConcepto?: string;
  defaultMonto?: number;
}

function todayInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

export function TransactionDrawer({
  open,
  onOpenChange,
  tipo,
  bankAccounts,
  clients = [],
  clientBalances = [],
  transaction,
  onSaved,
  defaultClientId,
  defaultConcepto,
  defaultMonto,
}: TransactionDrawerProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [concepto, setConcepto] = React.useState("");
  const [monto, setMonto] = React.useState("");
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [categoriaGasto, setCategoriaGasto] = React.useState<ExpenseCategory | "">("");
  const [clientId, setClientId] = React.useState("");
  const [fecha, setFecha] = React.useState(todayInputValue());

  const isEditing = !!transaction;
  const effectiveTipo = transaction?.tipo ?? tipo;
  const isIngreso = effectiveTipo === "INGRESO";
  const selectedBalance = clientBalances.find((b) => b.clientId === clientId);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (transaction) {
      setConcepto(transaction.concepto);
      setMonto(String(transaction.monto));
      setBankAccountId(transaction.bankAccountId);
      setCategoriaGasto((transaction.categoriaGasto as ExpenseCategory) ?? "");
      setClientId(transaction.clientId ?? "");
      setFecha(transaction.fecha.slice(0, 10));
    } else {
      setConcepto(defaultConcepto ?? "");
      setMonto(defaultMonto != null ? String(defaultMonto) : "");
      setBankAccountId("");
      setCategoriaGasto("");
      setClientId(defaultClientId ?? "");
      setFecha(todayInputValue());
    }
  }, [open, transaction, defaultClientId, defaultConcepto, defaultMonto]);

  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    const balance = clientBalances.find((b) => b.clientId === newClientId);
    // Solo autocompleta si el usuario no había escrito ya un monto, para no
    // pisarle un valor que haya capturado a mano.
    if (balance && balance.saldoPendiente > 0 && !monto) {
      setMonto(String(balance.saldoPendiente));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          tipo: effectiveTipo,
          monto: Number(monto),
          concepto,
          bankAccountId,
          categoriaGasto: isIngreso ? undefined : (categoriaGasto as ExpenseCategory),
          clientId: isIngreso && clientId ? clientId : undefined,
          fecha: new Date(`${fecha}T12:00:00`),
        };

        if (isEditing) {
          await updateTransaction({ transactionId: transaction!.id, ...payload });
        } else {
          await createTransaction(payload);
        }

        onOpenChange(false);
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al registrar el movimiento");
      }
    });
  }

  async function handleDelete() {
    if (!transaction) return;
    const ok = await confirm({
      title: `¿Eliminar "${transaction.concepto}"?`,
      description: "Esto también revierte el saldo de la cuenta.",
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteTransaction(transaction.id);
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar movimiento" : isIngreso ? "Registrar abono / ingreso" : "Registrar gasto"}
      description={isIngreso ? "El saldo de la cuenta se actualizará automáticamente" : undefined}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {isIngreso && clients.length > 0 && (
          <div className="space-y-1.5">
            <Label>Cliente (opcional)</Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sin cliente asociado" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombreNegocio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBalance && (
              <p className="text-xs text-muted-foreground">
                {selectedBalance.saldoPendiente > 0
                  ? `Debe ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(selectedBalance.saldoPendiente)} de ${format(new Date(selectedBalance.anio, selectedBalance.mes - 1), "MMMM", { locale: es })}`
                  : `Ya está al día de ${format(new Date(selectedBalance.anio, selectedBalance.mes - 1), "MMMM", { locale: es })}`}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="concepto">Concepto</Label>
          <Input
            id="concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder={isIngreso ? "Mensualidad julio" : "Ads Meta / Canva Pro"}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha del {isIngreso ? "abono" : "gasto"}</Label>
            <DatePicker value={fecha} onChange={setFecha} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cuenta bancaria</Label>
          <Select value={bankAccountId} onValueChange={setBankAccountId} required>
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

        {!isIngreso && (
          <div className="space-y-1.5">
            <Label>Categoría de gasto</Label>
            <Select value={categoriaGasto} onValueChange={(v) => setCategoriaGasto(v as ExpenseCategory)} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
          <Button type="submit" disabled={isPending || !bankAccountId}>
            {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : isIngreso ? "Registrar abono" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
