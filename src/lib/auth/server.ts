import { createAuthServer, neonAuth } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";

type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

let authServer: ReturnType<typeof createAuthServer> | null = null;

export function getAuthServer() {
  if (!authServer) {
    authServer = createAuthServer();
  }

  return authServer;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { user } = await neonAuth();
  return user ? (user as CurrentUser) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
