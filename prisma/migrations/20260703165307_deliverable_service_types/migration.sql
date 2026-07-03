-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeliverableType" ADD VALUE 'LOGO';
ALTER TYPE "DeliverableType" ADD VALUE 'SITIO_WEB';
ALTER TYPE "DeliverableType" ADD VALUE 'INVITACION_DIGITAL';
ALTER TYPE "DeliverableType" ADD VALUE 'LANDING_PAGE';
ALTER TYPE "DeliverableType" ADD VALUE 'OTRO';

-- AlterTable
ALTER TABLE "deliverables" ALTER COLUMN "anio" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ALTER COLUMN "mes" SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;
