"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  agencySlug: string;
}

export function DashboardSidebar({ agencySlug }: DashboardSidebarProps) {
  const pathname = usePathname();
  const base = `/${agencySlug}`;

  const links = [
    { href: base, label: "Resumen", icon: LayoutDashboardIcon, exact: true },
    { href: `${base}/entregables`, label: "Entregables", icon: KanbanSquareIcon },
    { href: `${base}/clientes`, label: "Clientes", icon: UsersIcon },
    { href: `${base}/calendario`, label: "Calendario", icon: CalendarDaysIcon },
    { href: `${base}/finanzas`, label: "Finanzas", icon: WalletIcon },
  ];

  return (
    <nav className="flex flex-col gap-1 p-2">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
