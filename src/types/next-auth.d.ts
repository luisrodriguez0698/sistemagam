import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    agencyId: string;
    agencySlug: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      agencyId: string;
      agencySlug: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    agencyId: string;
    agencySlug: string;
    role: Role;
  }
}
