import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { ROLES } from "@/lib/permissions";

/**
 * NextAuth configuration for COORIZON.
 *
 * - JWT session strategy (works without a database session store).
 * - Credentials provider: email + password (bcrypt-hashed in DB).
 * - Role and status are embedded in the JWT and exposed on the session.
 *
 * Only ACTIVE users can sign in. Pending recruiters (awaiting admin
 * validation) are blocked with a clear error message.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/#/login",
  },
  providers: [
    CredentialsProvider({
      name: "COORIZON",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) {
          throw new Error("Email et mot de passe requis.");
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            status: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        });

        if (!user) {
          throw new Error("Identifiants incorrects.");
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          throw new Error("Identifiants incorrects.");
        }

        if (!user.isActive) {
          throw new Error("Votre compte est désactivé. Contactez l'administration.");
        }

        if (user.status === "Pending") {
          throw new Error(
            "Votre compte est en attente de validation par l'administration. Vous recevrez un email dès activation."
          );
        }

        if (user.status === "Suspended") {
          throw new Error("Votre compte a été suspendu. Contactez l'administration.");
        }

        // Update last login timestamp (non-blocking)
        db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
};

/** Convenience export for the role constants used by callers. */
export { ROLES };
