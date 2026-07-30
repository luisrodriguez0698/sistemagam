-- Elimina el índice viejo basado en el enum `estado`
DROP INDEX IF EXISTS "deliverables_agencyId_estado_orden_idx";

-- El backfill ya llenó `statusId` para todas las filas existentes — es
-- seguro volverlo NOT NULL.
ALTER TABLE "deliverables" ALTER COLUMN "statusId" SET NOT NULL;

-- La columna vieja ya no se usa, todo pasó a `status`/`statusId`.
ALTER TABLE "deliverables" DROP COLUMN "estado";

-- El enum ya no lo referencia ninguna columna.
DROP TYPE "DeliverableStatus";

-- Índice nuevo, equivalente al anterior pero sobre `statusId`.
CREATE INDEX "deliverables_agencyId_statusId_orden_idx" ON "deliverables"("agencyId", "statusId", "orden");
