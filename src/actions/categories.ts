"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";

const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(60),
});

export async function updateCategory(input: z.infer<typeof updateCategorySchema>) {
  const { agencyId } = await getTenantSession();
  const { categoryId, name } = updateCategorySchema.parse(input);

  const result = await prisma.category.updateMany({ where: { id: categoryId, agencyId }, data: { name } });
  if (result.count === 0) throw new Error("Categoría no encontrada en esta agencia");

  revalidatePath("/[agencySlug]/clientes", "page");
}

/**
 * Eliminar una categoría no afecta a sus clientes: la relación usa
 * `onDelete: SetNull`, así que simplemente quedan sin categoría asignada.
 */
export async function deleteCategory(categoryId: string) {
  const { agencyId } = await getTenantSession();

  const result = await prisma.category.deleteMany({ where: { id: categoryId, agencyId } });
  if (result.count === 0) throw new Error("Categoría no encontrada en esta agencia");

  revalidatePath("/[agencySlug]/clientes", "page");
}
