import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
      firstName?: string | null;
      lastName?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    status: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    status: string;
    firstName?: string | null;
    lastName?: string | null;
  }
}
