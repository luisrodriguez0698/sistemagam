-- AlterTable
ALTER TABLE "deliverables" ALTER COLUMN "anio" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ALTER COLUMN "mes" SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "deliverableId" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
