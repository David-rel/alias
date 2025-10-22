import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { query, pool, type DbUserRow } from "./db";

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

        try {
          const client = await pool.connect();
          try {
            const existing = await client.query<{ role: string | null }>(
              `SELECT role
                 FROM business_team_members
                WHERE (user_id = $1 OR LOWER(email) = $2)
                ORDER BY invited_at DESC
                LIMIT 1`,
              [user.id, normalizedEmail],
            );

            if (existing.rowCount && existing.rows.length) {
              const currentRole = existing.rows[0].role;
              const safeRole = currentRole === "owner" || currentRole === "admin" ? currentRole : "guest";

              await client.query(
                `UPDATE business_team_members
                   SET invite_status = 'accepted',
                       joined_at = COALESCE(joined_at, NOW()),
                       user_id = COALESCE(user_id, $1),
                       role = $3
                 WHERE invite_status <> 'accepted'
                   AND (user_id = $1 OR LOWER(email) = $2)`,
                [user.id, normalizedEmail, safeRole],
              );
            }
          } finally {
            client.release();
          }
        } catch (error) {
          console.error("Failed to mark team invite as accepted", error);
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
