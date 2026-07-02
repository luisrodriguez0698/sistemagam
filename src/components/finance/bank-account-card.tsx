import { LandmarkIcon } from "lucide-react";

export interface BankAccountCardData {
  id: string;
  nombreBanco: string;
  saldoActual: number;
}

export function BankAccountCard({ account }: { account: BankAccountCardData }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{account.nombreBanco}</span>
        <LandmarkIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold">
        {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(account.saldoActual)}
      </p>
    </div>
  );
}
