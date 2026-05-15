import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/server/db/client";
import { normalizeRole, type Role } from "@/lib/auth/roles";
import { verifyPassword } from "@/server/auth/password";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    CredentialsProvider({
      name: "Internal account",
      credentials: {
        email: {
          label: "Email",
          type: "email"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        const user = await db.user.findUnique({
          where: {
            email
          }
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: normalizeRole(user.role)
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
      }

      if (user && "role" in user) {
        token.role = normalizeRole((user.role as string | undefined) ?? "member");
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.id ?? "";
        session.user.role = normalizeRole((token.role as string | undefined) ?? "member");
      }

      return session;
    }
  }
};
