import { notFound } from "next/navigation";
import { assertTenantMatchesSlug } from "@/lib/tenant";
import { ensurePaymentStatusesFresh } from "@/lib/payment-status";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationsBell } from "@/components/notifications-bell";

interface AgencyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ agencySlug: string }>;
}

// Todas las rutas bajo /[agencySlug]/* pasan por aquí primero: si la sesión
// activa no pertenece a esta agencia, se corta el acceso antes de renderizar
// cualquier página o Server Component hijo.
export default async function AgencyLayout({ children, params }: AgencyLayoutProps) {
  const { agencySlug } = await params;
  let agencyId: string;
  try {
    ({ agencyId } = await assertTenantMatchesSlug(agencySlug));
  } catch {
    notFound();
  }

  await ensurePaymentStatusesFresh(agencyId);
  const overdueClients = await prisma.client.findMany({
    where: { agencyId, activo: true, estatusPago: { in: ["PENDIENTE", "VENCIDO"] } },
    select: { id: true, nombreNegocio: true, estatusPago: true },
    orderBy: { estatusPago: "desc" },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <div className="px-4 py-4 text-sm font-semibold">Gestión de Agencias</div>
        <DashboardSidebar agencySlug={agencySlug} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <span className="text-sm font-semibold md:hidden">Gestión de Agencias</span>
          <span className="hidden md:block" />
          <div className="flex items-center gap-1">
            <NotificationsBell
              agencySlug={agencySlug}
              clients={overdueClients.map((c) => ({
                id: c.id,
                nombreNegocio: c.nombreNegocio,
                estatusPago: c.estatusPago as "PENDIENTE" | "VENCIDO",
              }))}
            />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
      </div>

      <MobileTabBar agencySlug={agencySlug} />
    </div>
  );
}
