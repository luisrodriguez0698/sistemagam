"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantSession } from "@/lib/tenant";
import { EventType } from "@prisma/client";

const eventSchema = z
  .object({
    titulo: z.string().min(1).max(120),
    tipo: z.nativeEnum(EventType),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    notas: z.string().max(2000).optional(),
    clientId: z.string().min(1).optional(),
  })
  .refine((data) => data.fechaFin >= data.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });

export async function createEvent(input: z.infer<typeof eventSchema>) {
  const { agencyId } = await getTenantSession();
  const data = eventSchema.parse(input);

  if (data.clientId) {
    const client = await prisma.client.findFirst({ where: { id: data.clientId, agencyId } });
    if (!client) throw new Error("Cliente no encontrado en esta agencia");
  }

  await prisma.event.create({ data: { ...data, agencyId } });
  revalidatePath("/[agencySlug]/calendario", "page");
}

const updateEventSchema = eventSchema.and(z.object({ eventId: z.string().min(1) }));

export async function updateEvent(input: z.infer<typeof updateEventSchema>) {
  const { agencyId } = await getTenantSession();
  const { eventId, ...data } = updateEventSchema.parse(input);

  const result = await prisma.event.updateMany({
    where: { id: eventId, agencyId },
    data,
  });
  if (result.count === 0) throw new Error("Evento no encontrado en esta agencia");

  revalidatePath("/[agencySlug]/calendario", "page");
}

export async function deleteEvent(eventId: string) {
  const { agencyId } = await getTenantSession();

  const result = await prisma.event.deleteMany({ where: { id: eventId, agencyId } });
  if (result.count === 0) throw new Error("Evento no encontrado en esta agencia");

  revalidatePath("/[agencySlug]/calendario", "page");
}
