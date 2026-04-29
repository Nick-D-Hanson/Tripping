"use client";

import { AuthView, type AuthViewPath } from "@neondatabase/auth-ui";

export function AuthPanel({ path }: { path: string }) {
  return <AuthView path={path as AuthViewPath} />;
}
