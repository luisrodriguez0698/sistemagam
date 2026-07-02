"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBankAccount } from "@/actions/bank-accounts";

interface BankAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankAccountDrawer({ open, onOpenChange }: BankAccountDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [nombreBanco, setNombreBanco] = React.useState("");
  const [saldoInicial, setSaldoInicial] = React.useState("0");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createBankAccount({ nombreBanco, saldoInicial: Number(saldoInicial) });
        setNombreBanco("");
        setSaldoInicial("0");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al crear la cuenta");
      }
    });
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Nueva cuenta bancaria" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="nombreBanco">Nombre del banco</Label>
          <Input
            id="nombreBanco"
            value={nombreBanco}
            onChange={(e) => setNombreBanco(e.target.value)}
            placeholder="Ej. BBVA, Santander..."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="saldoInicial">Saldo inicial</Label>
          <Input
            id="saldoInicial"
            type="number"
            min="0"
            step="0.01"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear cuenta"}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
