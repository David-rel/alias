import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { query, type DbUserRow } from "./db";

async function findUserByEmail(email: string) {
  const result = await query<DbUserRow>("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0];
}

async function findUserById(id: string) {
  const result = await query<DbUserRow>("SELECT * FROM users WHERE id = $1", [
    id,
  ]);
  return result.rows[0];
}

type AuthenticatedUser = User & {
  onboardingCompleted: boolean;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await findUserByEmail(normalizedEmail);

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const passwordValid = await compare(
          credentials.password,
          user.password_hash,
        );

        if (!passwordValid) {
          throw new Error("Invalid email or password");
        }

        if (!user.email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const safeUser: AuthenticatedUser = {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          onboardingCompleted: user.onboarding_completed,
        };

        return safeUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = (user as AuthenticatedUser)
          .onboardingCompleted;
      } else if (token?.id) {
        const dbUser = await findUserById(token.id as string);
        token.onboardingCompleted = dbUser?.onboarding_completed ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
        session.user.onboardingCompleted =
          (token.onboardingCompleted as boolean | undefined) ?? false;
      }
      return session;
    },
  },
};
