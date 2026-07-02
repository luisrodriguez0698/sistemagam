"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";
import { cn } from "@/lib/utils";

export function PasswordStrengthList({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5",
              passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            {passed ? <CheckIcon className="size-3.5 shrink-0" /> : <XIcon className="size-3.5 shrink-0" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
