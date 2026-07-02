-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN     "anio" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ADD COLUMN     "esExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mes" INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- CreateIndex
CREATE INDEX "deliverables_agencyId_anio_mes_idx" ON "deliverables"("agencyId", "anio", "mes");
