-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN     "statusId" TEXT,
ALTER COLUMN "anio" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int,
ALTER COLUMN "mes" SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- CreateTable
CREATE TABLE "pipeline_statuses" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "orden" INTEGER NOT NULL,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "esFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,

    CONSTRAINT "pipeline_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_statuses_agencyId_orden_idx" ON "pipeline_statuses"("agencyId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_statuses_agencyId_nombre_key" ON "pipeline_statuses"("agencyId", "nombre");

-- AddForeignKey
ALTER TABLE "pipeline_statuses" ADD CONSTRAINT "pipeline_statuses_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "pipeline_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
