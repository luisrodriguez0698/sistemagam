"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email o contraseña incorrectos");
        return;
      }
      // La raíz "/" resuelve el slug de la agencia a partir de la sesión.
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 size-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-sm space-y-6">
        <p className="text-center text-sm font-semibold tracking-tight text-muted-foreground">
          Gestión de Agencias
        </p>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Inicia sesión</CardTitle>
            <CardDescription>Accede al panel de tu agencia</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes una agencia registrada?{" "}
              <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
                Créala aquí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
