"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/password";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos tras el NFD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const registerAgencySchema = z.object({
  agencyName: z.string().min(2).max(80),
  adminName: z.string().min(2).max(80),
  email: z.string().email(),
  password: passwordSchema,
});

/**
 * Crea una nueva Agencia (tenant) junto con su primer usuario ADMIN.
 * El slug se deriva del nombre y se desambigua agregando un sufijo si ya
 * existe, para no exponerle al usuario un error técnico de unicidad.
 */
export async function registerAgency(input: z.infer<typeof registerAgencySchema>) {
  const data = registerAgencySchema.parse(input);
  const baseSlug = slugify(data.agencyName) || "agencia";

  let slug = baseSlug;
  for (let attempt = 1; await prisma.agency.findUnique({ where: { slug } }); attempt++) {
    slug = `${baseSlug}-${attempt}`;
  }

  const passwordHash = await hash(data.password, 10);

  const agency = await prisma.$transaction(async (tx) => {
    const createdAgency = await tx.agency.create({
      data: { name: data.agencyName, slug },
    });

    await tx.user.create({
      data: {
        name: data.adminName,
        email: data.email,
        password: passwordHash,
        role: "ADMIN",
        agencyId: createdAgency.id,
      },
    });

    return createdAgency;
  });

  return { agencySlug: agency.slug };
}
