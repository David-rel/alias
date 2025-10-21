import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      onboardingCompleted?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompleted?: boolean;
  }
}
