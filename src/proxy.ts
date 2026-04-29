import { neonAuthMiddleware } from "@neondatabase/auth/next/server";
import { NextResponse, type NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return neonAuthMiddleware({
    loginUrl: "/login",
  })(request);
}

export const config = {
  matcher: ["/trips/:path*"],
};
