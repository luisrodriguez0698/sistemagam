-- CreateEnum
CREATE TYPE "ExtraPaymentStatus" AS ENUM ('PENDIENTE', 'PAGADO');

-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN     "estatusPagoExtra" "ExtraPaymentStatus",
ADD COLUMN     "montoExtra" DECIMAL(10,2),
ALTER COLUMN "anio" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ALTER COLUMN "mes" SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;
