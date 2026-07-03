"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

const deliverableConfigSchema = z.object({
  videosMensuales: z.coerce.number().int().min(0).max(100),
  disenosMensuales: z.coerce.number().int().min(0).max(100),
});

const clientSchema = z.object({
  nombreNegocio: z.string().min(1).max(120),
  contacto: z.string().max(120).optional(),
  telefono: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  totalMensualidad: z.coerce.number().min(0),
  diaCobro: z.coerce.number().int().min(1).max(31).optional(),
  // Mes desde el que se le empieza a cobrar la mensualidad (ej. contratado
  // en junio → debe junio y julio, nunca antes).
  fechaContratacion: z.coerce.date(),
  categoryId: z.string().min(1).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  ...deliverableConfigSchema.shape,
});

async function upsertDeliverableConfig(
  tx: Prisma.TransactionClient,
  clientId: string,
  agencyId: string,
  videosMensuales: number,
  disenosMensuales: number
) {
  await tx.clientDeliverableConfig.upsert({
    where: { clientId_tipo: { clientId, tipo: "VIDEO" } },
    create: { clientId, agencyId, tipo: "VIDEO", cantidadMensual: videosMensuales },
    update: { cantidadMensual: videosMensuales },
  });
  await tx.clientDeliverableConfig.upsert({
    where: { clientId_tipo: { clientId, tipo: "DISENO" } },
    create: { clientId, agencyId, tipo: "DISENO", cantidadMensual: disenosMensuales },
    update: { cantidadMensual: disenosMensuales },
  });
}

export async function createClient(input: z.infer<typeof clientSchema>) {
  const { agencyId } = await getTenantSession();
  const data = clientSchema.parse(input);

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, agencyId } });
    if (!category) throw new Error("Categoría no encontrada en esta agencia");
  }

  await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        agencyId,
        nombreNegocio: data.nombreNegocio,
        contacto: data.contacto || undefined,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        totalMensualidad: data.totalMensualidad,
        diaCobro: data.diaCobro,
        fechaContratacion: data.fechaContratacion,
        categoryId: data.categoryId || undefined,
        colorHex: data.colorHex,
      },
    });

    await upsertDeliverableConfig(tx, client.id, agencyId, data.videosMensuales, data.disenosMensuales);
  });

  revalidatePath("/[agencySlug]/clientes", "page");
}

const updateClientSchema = clientSchema.and(z.object({ clientId: z.string().min(1) }));

export async function updateClient(input: z.infer<typeof updateClientSchema>) {
  const { agencyId } = await getTenantSession();
  const { clientId, ...data } = updateClientSchema.parse(input);

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, agencyId } });
    if (!category) throw new Error("Categoría no encontrada en esta agencia");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.client.updateMany({
      where: { id: clientId, agencyId },
      data: {
        nombreNegocio: data.nombreNegocio,
        contacto: data.contacto || undefined,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        totalMensualidad: data.totalMensualidad,
        diaCobro: data.diaCobro,
        fechaContratacion: data.fechaContratacion,
        categoryId: data.categoryId || null,
        colorHex: data.colorHex,
      },
    });
    if (result.count === 0) throw new Error("Cliente no encontrado en esta agencia");

    await upsertDeliverableConfig(tx, clientId, agencyId, data.videosMensuales, data.disenosMensuales);
  });

  revalidatePath("/[agencySlug]/clientes", "page");
}

export async function setClientActive(clientId: string, activo: boolean) {
  const { agencyId } = await getTenantSession();

  const result = await prisma.client.updateMany({ where: { id: clientId, agencyId }, data: { activo } });
  if (result.count === 0) throw new Error("Cliente no encontrado en esta agencia");

  revalidatePath("/[agencySlug]/clientes", "page");
}

const createCategorySchema = z.object({ name: z.string().min(1).max(60) });

export async function createCategory(input: z.infer<typeof createCategorySchema>) {
  const { agencyId } = await getTenantSession();
  const { name } = createCategorySchema.parse(input);

  const category = await prisma.category.upsert({
    where: { agencyId_name: { agencyId, name } },
    create: { agencyId, name },
    update: {},
  });

  revalidatePath("/[agencySlug]/clientes", "page");
  return { id: category.id, name: category.name };
}
