import { withAuth } from "next-auth/middleware";

// Next.js 16 renombró la convención "middleware" a "proxy" (mismo
// comportamiento, mismo lugar en src/, solo cambia el nombre del archivo).
// `withAuth` ya exporta una función por default, válida para ambas
// convenciones, así que no hubo que tocar el código, solo el nombre del
// archivo. Protege todo excepto /login, /register y los assets/rutas
// internas de Next y de NextAuth. La verificación fina de que el
// :agencySlug de la URL pertenezca al tenant de la sesión ocurre en
// src/app/(dashboard)/[agencySlug]/layout.tsx (defensa en profundidad).
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
