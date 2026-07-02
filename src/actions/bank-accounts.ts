"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";

const MAX_BANK_ACCOUNTS_PER_AGENCY = 5;

const createBankAccountSchema = z.object({
  nombreBanco: z.string().min(1).max(80),
  saldoInicial: z.coerce.number().min(0).default(0),
});

export async function createBankAccount(input: z.infer<typeof createBankAccountSchema>) {
  const { agencyId } = await getTenantSession();
  const data = createBankAccountSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const count = await tx.bankAccount.count({ where: { agencyId, activa: true } });
    if (count >= MAX_BANK_ACCOUNTS_PER_AGENCY) {
      throw new Error(`Cada agencia puede tener hasta ${MAX_BANK_ACCOUNTS_PER_AGENCY} cuentas bancarias activas`);
    }

    await tx.bankAccount.create({
      data: {
        agencyId,
        nombreBanco: data.nombreBanco,
        saldoActual: data.saldoInicial,
      },
    });
  });

  revalidatePath("/[agencySlug]/finanzas", "page");
}
