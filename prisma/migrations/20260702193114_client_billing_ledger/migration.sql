-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "fechaContratacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "deliverables" ALTER COLUMN "anio" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ALTER COLUMN "mes" SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "clientBillingId" TEXT;

-- CreateTable
CREATE TABLE "client_billings" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "montoEsperado" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "client_billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_billings_agencyId_anio_mes_idx" ON "client_billings"("agencyId", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "client_billings_clientId_anio_mes_key" ON "client_billings"("clientId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "client_billings" ADD CONSTRAINT "client_billings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_billings" ADD CONSTRAINT "client_billings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_clientBillingId_fkey" FOREIGN KEY ("clientBillingId") REFERENCES "client_billings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
