"use client";

import { AuthView, type AuthViewPath } from "@neondatabase/auth-ui";

export function AuthPanel({ path }: { path: string }) {
  return <div className="pt-1"><AuthView path={path as AuthViewPath} /></div>;
}
