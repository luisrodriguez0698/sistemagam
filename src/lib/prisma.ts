import { Prisma, PrismaClient } from "@prisma/client";

// Códigos de Prisma para cortes transitorios de conexión (proxy que resetea
// el socket a medio handshake SSL, timeout de red, servidor que cierra la
// conexión) — nunca errores de datos (constraint, validación, etc.), esos
// deben seguir reventando de inmediato.
const RETRYABLE_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
const RETRY_DELAYS_MS = [250, 750, 1500];

function isRetryableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_ERROR_CODES.has(error.code);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extensión sobre TODAS las operaciones (findMany, groupBy, transaction,
// etc.) para reintentar automáticamente cortes de red breves — como los
// "SSL error: unexpected eof" que vimos en los logs de Railway — sin tener
// que envolver cada llamada a `prisma.*` de la app una por una.
function buildPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (attempt >= RETRY_DELAYS_MS.length || !isRetryableError(error)) throw error;
            await sleep(RETRY_DELAYS_MS[attempt]);
          }
        }
      },
    },
  });
}

// Singleton estándar para evitar agotar conexiones con el HMR de Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// El cliente extendido es funcionalmente un PrismaClient normal (mismos
// modelos, mismos métodos) — se castea de vuelta al tipo original porque el
// tipo que genera `$extends` no encaja con las firmas de `Prisma.TransactionClient`
// que ya se usan en las Server Actions (ej. `prisma.$transaction(async (tx: Prisma.TransactionClient) => ...)`),
// y no vale la pena tocar cada call site por esto.
export const prisma = globalForPrisma.prisma ?? (buildPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
