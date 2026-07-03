"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankAccountCard, type BankAccountCardData } from "./bank-account-card";
import { BankAccountDrawer } from "./bank-account-drawer";
import { TransactionDrawer } from "./transaction-drawer";
import { OutstandingBalances } from "./outstanding-balances";
import { CampaignsSection, type CampaignRow } from "./campaigns-section";
import type { CampaignDeliverableOption } from "./campaign-drawer";
import type { OutstandingBalance } from "@/lib/payment-status";
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
  outstandingBalances: OutstandingBalance[];
  campaigns: CampaignRow[];
  campaignDeliverables: CampaignDeliverableOption[];
  pagination: PaginationInfo;
  filters: TransactionFilters;
}

export function FinanceView({
  bankAccounts,
  transactions,
  clients,
  clientBalances,
  outstandingBalances,
  campaigns,
  campaignDeliverables,
  pagination,
  filters,
}: FinanceViewProps) {
  const router = useRouter();
  const [accountDrawerOpen, setAccountDrawerOpen] = React.useState(false);
  const [newTransactionTipo, setNewTransactionTipo] = React.useState<"INGRESO" | "GASTO" | null>(null);
  const [editingTransaction, setEditingTransaction] = React.useState<TransactionRow | null>(null);
  const [prefill, setPrefill] = React.useState<{ clientId: string; concepto: string; monto: number } | null>(null);

  const canAddAccount = bankAccounts.length < MAX_BANK_ACCOUNTS;
  const drawerOpen = !!newTransactionTipo || !!editingTransaction;

  function closeTransactionDrawer(open: boolean) {
    if (open) return;
    setNewTransactionTipo(null);
    setEditingTransaction(null);
    setPrefill(null);
  }

  function handleRegisterOutstanding(balance: OutstandingBalance) {
    const monthLabel = format(new Date(balance.anio, balance.mes - 1, 1), "MMMM", { locale: es });
    setPrefill({
      clientId: balance.clientId,
      concepto: `Mensualidad ${monthLabel}`,
      monto: balance.saldoPendiente,
    });
    setNewTransactionTipo("INGRESO");
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

      <div>
        <h2 className="mb-2 text-sm font-semibold">Cuentas por cobrar</h2>
        <OutstandingBalances balances={outstandingBalances} onRegisterPayment={handleRegisterOutstanding} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Campañas</h2>
        <CampaignsSection
          campaigns={campaigns}
          clients={clients}
          deliverables={campaignDeliverables}
          bankAccounts={bankAccounts}
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
          defaultClientId={prefill?.clientId}
          defaultConcepto={prefill?.concepto}
          defaultMonto={prefill?.monto}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
