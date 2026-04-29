import { authApiHandler } from "@neondatabase/auth/next/server";

export const dynamic = "force-dynamic";

type AuthContext = { params: Promise<{ path: string[] }> };

function missingAuthEnv() {
  return Response.json(
    { error: "NEON_AUTH_BASE_URL is not configured. Copy .env.example to .env.local and set Neon Auth values." },
    { status: 503 },
  );
}

export function GET(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().GET(request, context);
}

export function POST(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().POST(request, context);
}

export function PUT(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().PUT(request, context);
}

export function DELETE(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().DELETE(request, context);
}

export function PATCH(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().PATCH(request, context);
}
