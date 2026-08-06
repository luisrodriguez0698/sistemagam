-- AlterTable: nueva imagen de ejemplo (inspiración, distinta de archivoUrl
-- que es la imagen del entregable ya hecho) y varios links de ejemplo en
-- vez de uno solo.
ALTER TABLE "deliverables"
  ADD COLUMN     "imagenEjemploUrl" TEXT,
  ADD COLUMN     "imagenEjemploKey" TEXT,
  ADD COLUMN     "linksEjemplo" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: el link único que ya existía pasa a ser el primer elemento del
-- arreglo, para no perder datos de entregables ya capturados.
UPDATE "deliverables"
SET "linksEjemplo" = ARRAY["linkEjemplo"]
WHERE "linkEjemplo" IS NOT NULL AND "linkEjemplo" != '';

-- AlterTable
ALTER TABLE "deliverables" DROP COLUMN "linkEjemplo";
