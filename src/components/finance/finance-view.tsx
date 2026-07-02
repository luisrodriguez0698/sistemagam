"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankAccountCard, type BankAccountCardData } from "./bank-account-card";
import { BankAccountDrawer } from "./bank-account-drawer";
import { TransactionDrawer } from "./transaction-drawer";
import {
  TransactionsTable,
  type PaginationInfo,
  type TransactionFilters,
  type TransactionRow,
} from "./transactions-table";

const MAX_BANK_ACCOUNTS = 5;

interface ClientOption {
  id: string;
  nombreNegocio: string;
}

export interface ClientBalance {
  clientId: string;
  anio: number;
  mes: number;
  saldoPendiente: number;
}

interface FinanceViewProps {
  bankAccounts: BankAccountCardData[];
  transactions: TransactionRow[];
  clients: ClientOption[];
  clientBalances: ClientBalance[];
  pagination: PaginationInfo;
  filters: TransactionFilters;
}

export function FinanceView({
  bankAccounts,
  transactions,
  clients,
  clientBalances,
  pagination,
  filters,
}: FinanceViewProps) {
  const router = useRouter();
  const [accountDrawerOpen, setAccountDrawerOpen] = React.useState(false);
  const [newTransactionTipo, setNewTransactionTipo] = React.useState<"INGRESO" | "GASTO" | null>(null);
  const [editingTransaction, setEditingTransaction] = React.useState<TransactionRow | null>(null);

  const canAddAccount = bankAccounts.length < MAX_BANK_ACCOUNTS;
  const drawerOpen = !!newTransactionTipo || !!editingTransaction;

  function closeTransactionDrawer(open: boolean) {
    if (open) return;
    setNewTransactionTipo(null);
    setEditingTransaction(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">Cartera de bancos e historial de movimientos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => setNewTransactionTipo("GASTO")}>
            <TrendingDownIcon className="size-4" />
            Registrar gasto
          </Button>
          <Button className="gap-1" onClick={() => setNewTransactionTipo("INGRESO")}>
            <TrendingUpIcon className="size-4" />
            Registrar abono
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bankAccounts.map((account) => (
          <BankAccountCard key={account.id} account={account} />
        ))}

        {canAddAccount && (
          <button
            onClick={() => setAccountDrawerOpen(true)}
            className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <PlusIcon className="size-5" />
            Agregar cuenta
          </button>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Movimientos</h2>
        <TransactionsTable
          transactions={transactions}
          pagination={pagination}
          filters={filters}
          onEdit={setEditingTransaction}
        />
      </div>

      <BankAccountDrawer open={accountDrawerOpen} onOpenChange={setAccountDrawerOpen} />

      {drawerOpen && (
        <TransactionDrawer
          open={drawerOpen}
          onOpenChange={closeTransactionDrawer}
          tipo={newTransactionTipo ?? "INGRESO"}
          transaction={editingTransaction}
          bankAccounts={bankAccounts}
          clients={clients}
          clientBalances={clientBalances}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
