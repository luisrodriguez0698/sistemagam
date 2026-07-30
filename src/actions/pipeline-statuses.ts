"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";

const createSchema = z.object({
  nombre: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  esFinal: z.boolean().default(false),
});

/** Agrega una columna nueva al Tablero, al final (orden más alto) de esta agencia. */
export async function createPipelineStatus(input: z.infer<typeof createSchema>) {
  const { agencyId } = await getTenantSession();
  const data = createSchema.parse(input);

  const maxOrden = await prisma.pipelineStatus.aggregate({ where: { agencyId }, _max: { orden: true } });

  await prisma.pipelineStatus.create({
    data: {
      agencyId,
      nombre: data.nombre,
      color: data.color,
      esFinal: data.esFinal,
      orden: (maxOrden._max.orden ?? -1) + 1,
    },
  });

  revalidatePath("/[agencySlug]/entregables", "page");
}

const updateSchema = z.object({
  statusId: z.string().min(1),
  nombre: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  esFinal: z.boolean().default(false),
});

/** Renombra/recolorea/marca-como-final un estatus — incluso los 4 originales (`esDefault`). */
export async function updatePipelineStatus(input: z.infer<typeof updateSchema>) {
  const { agencyId } = await getTenantSession();
  const data = updateSchema.parse(input);

  const result = await prisma.pipelineStatus.updateMany({
    where: { id: data.statusId, agencyId },
    data: { nombre: data.nombre, color: data.color, esFinal: data.esFinal },
  });
  if (result.count === 0) throw new Error("Estatus no encontrado en esta agencia");

  revalidatePath("/[agencySlug]/entregables", "page");
}

/**
 * Elimina un estatus/columna. Los 4 originales (`esDefault`) no se pueden
 * borrar (sí renombrar/recolorear) — y ninguno se puede borrar si todavía
 * tiene entregables ahí, para no dejarlos huérfanos.
 */
export async function deletePipelineStatus(statusId: string) {
  const { agencyId } = await getTenantSession();

  const status = await prisma.pipelineStatus.findFirst({
    where: { id: statusId, agencyId },
    include: { _count: { select: { deliverables: true } } },
  });
  if (!status) throw new Error("Estatus no encontrado en esta agencia");
  if (status.esDefault) {
    throw new Error("Los estatus originales no se pueden eliminar — puedes renombrarlos o recolorearlos");
  }
  if (status._count.deliverables > 0) {
    throw new Error("Este estatus tiene entregables asignados — muévelos a otro estatus antes de eliminarlo");
  }

  await prisma.pipelineStatus.delete({ where: { id: statusId } });

  revalidatePath("/[agencySlug]/entregables", "page");
}

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

/** Reordena las columnas del Tablero (izquierda a derecha) para esta agencia. */
export async function reorderPipelineStatuses(input: z.infer<typeof reorderSchema>) {
  const { agencyId } = await getTenantSession();
  const { orderedIds } = reorderSchema.parse(input);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.pipelineStatus.updateMany({ where: { id, agencyId }, data: { orden: index } })
    )
  );

  revalidatePath("/[agencySlug]/entregables", "page");
}
