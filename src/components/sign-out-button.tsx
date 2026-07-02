"use client";

import { LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOutIcon className="size-4" />
    </Button>
  );
}
