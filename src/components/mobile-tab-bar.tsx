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

interface MobileTabBarProps {
  agencySlug: string;
}

export function MobileTabBar({ agencySlug }: MobileTabBarProps) {
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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
