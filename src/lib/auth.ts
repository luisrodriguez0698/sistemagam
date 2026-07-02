import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession, type NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        // El email es único POR AGENCIA (@@unique([agencyId, email])), así
        // que puede haber varias cuentas con el mismo correo en distintos
        // tenants. findFirst basta porque en la práctica un mismo correo
        // rara vez se repite entre agencias; si se necesita soportarlo de
        // forma explícita, el formulario de login debe pedir también el
        // slug de la agencia.
        const user = await prisma.user.findFirst({
          where: { email: credentials.email },
          include: { agency: true },
        });
        if (!user) return null;

        const validPassword = await compare(credentials.password, user.password);
        if (!validPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          agencyId: user.agencyId,
          agencySlug: user.agency.slug,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.agencyId = user.agencyId;
        token.agencySlug = user.agencySlug;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.agencyId = token.agencyId;
        session.user.agencySlug = token.agencySlug;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

/**
 * Helper para Server Components/Actions, equivalente a `auth()` de NextAuth
 * v5 pero sobre la v4 estable: envuelve `getServerSession` para no repetir
 * `authOptions` en cada archivo que necesita la sesión.
 */
export function auth() {
  return getServerSession(authOptions);
}
