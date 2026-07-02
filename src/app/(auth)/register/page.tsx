"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthList } from "@/components/password-strength-list";
import { PASSWORD_RULES } from "@/lib/password";
import { registerAgency } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [agencyName, setAgencyName] = React.useState("");
  const [adminName, setAdminName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const isPasswordValid = PASSWORD_RULES.every((rule) => rule.test(password));
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("La contraseña no cumple con todos los requisitos");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    startTransition(async () => {
      try {
        const { agencySlug } = await registerAgency({ agencyName, adminName, email, password });

        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) {
          setError("Agencia creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión manualmente.");
          router.push("/login");
          return;
        }

        router.push(`/${agencySlug}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error al crear la agencia");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Crea tu agencia</h1>
          <p className="text-sm text-muted-foreground">
            Registra tu agencia y tu cuenta de administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agencyName">Nombre de la agencia</Label>
            <Input id="agencyName" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminName">Tu nombre</Label>
            <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && <PasswordStrengthList password={password} />}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-invalid={!passwordsMatch}
            />
            {!passwordsMatch && <p className="text-xs text-destructive">Las contraseñas no coinciden</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !isPasswordValid || password !== confirmPassword}
          >
            {isPending ? "Creando agencia..." : "Crear agencia"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
