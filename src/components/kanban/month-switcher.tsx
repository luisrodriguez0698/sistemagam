"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthSwitcherProps {
  year: number;
  month: number; // 1-indexed
}

export function MonthSwitcher({ year, month }: MonthSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = new Date(year, month - 1, 1);

  function goToMonth(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(date, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="size-8" onClick={() => goToMonth(addMonths(current, -1))}>
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="w-32 text-center text-sm font-medium capitalize">
        {format(current, "MMMM yyyy", { locale: es })}
      </span>
      <Button variant="outline" size="icon" className="size-8" onClick={() => goToMonth(addMonths(current, 1))}>
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
