import { auth } from "@/lib/auth";
import { cache } from "react";

export type TenantSession = {
  userId: string;
  agencyId: string;
  agencySlug: string;
  role: "ADMIN" | "MEMBER";
};

/**
 * Punto único de resolución de sesión + tenant. Todo Server Action y route
 * handler del sistema DEBE pasar por aquí antes de tocar la base de datos:
 * es la barrera que garantiza que un usuario de la Agencia A nunca pueda
 * leer/escribir filas de la Agencia B.
 */
export const getTenantSession = cache(async (): Promise<TenantSession> => {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  return {
    userId: session.user.id,
    agencyId: session.user.agencyId,
    agencySlug: session.user.agencySlug,
    role: session.user.role,
  };
});

/**
 * Verifica que el slug de la URL coincide con la agencia de la sesión.
 * Úsalo en el layout de `/[agencySlug]` para bloquear acceso cruzado si
 * alguien manipula la URL manualmente.
 */
export async function assertTenantMatchesSlug(agencySlug: string) {
  const session = await getTenantSession();
  if (session.agencySlug !== agencySlug) {
    throw new Error("No tienes acceso a esta agencia");
  }
  return session;
}
