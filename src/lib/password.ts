import { z } from "zod";

export const PASSWORD_RULES = [
  { key: "length", label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Una letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Una letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", label: "Un número", test: (v: string) => /[0-9]/.test(v) },
  { key: "symbol", label: "Un símbolo (!@#$...)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

// Fuente única de verdad: el mismo esquema valida en el formulario (cliente)
// y en la Server Action (servidor), para no confiar solo en la validación
// del navegador.
export const passwordSchema = z
  .string()
  .min(8, "Debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una letra mayúscula")
  .regex(/[a-z]/, "Debe incluir al menos una letra minúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un símbolo");
