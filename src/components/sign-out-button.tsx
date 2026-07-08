"use client";

import { LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";

export function SignOutButton() {
  const confirm = useConfirm();

  async function handleClick() {
    const ok = await confirm({
      title: "¿Cerrar sesión?",
      confirmText: "Cerrar sesión",
    });
    if (!ok) return;
    signOut({ callbackUrl: "/login" });
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={handleClick}>
      <LogOutIcon className="size-4" />
    </Button>
  );
}
