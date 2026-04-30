import { authApiHandler } from "@neondatabase/auth/next/server";

export const dynamic = "force-dynamic";

type AuthContext = { params: Promise<{ path: string[] }> };

function missingAuthEnv() {
  return Response.json(
    { error: "NEON_AUTH_BASE_URL is not configured. Copy .env.example to .env.local and set Neon Auth values." },
    { status: 503 },
  );
}

function isMobileSafari(userAgent: string | null) {
  if (!userAgent) return false;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafariEngine = /Safari/i.test(userAgent);
  const isExcludedBrowser = /CriOS|Chrome|EdgiOS|Edg|FxiOS|Firefox|OPiOS|OPR|SamsungBrowser/i.test(userAgent);
  return isAppleMobile && isSafariEngine && !isExcludedBrowser;
}

function normalizeAuthRequest(request: Request) {
  const userAgent = request.headers.get("user-agent");

  if (!isMobileSafari(userAgent)) {
    return request;
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");
  const hasSameOriginSignals =
    referer?.startsWith(requestOrigin) ||
    fetchSite === "same-origin" ||
    fetchSite === "same-site";

  if ((origin === requestOrigin && referer) || !hasSameOriginSignals) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("origin", requestOrigin);

  if (!referer) {
    headers.set("referer", requestOrigin);
  }

  return new Request(request, {
    headers,
  });
}

async function logForbiddenAuthResponse(request: Request, response: Response) {
  if (response.status !== 403) {
    return response;
  }

  let body = "";
  try {
    body = await response.clone().text();
  } catch {
    body = "";
  }

  console.error("[auth-403]", {
    url: request.url,
    method: request.method,
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    userAgent: request.headers.get("user-agent"),
    body,
  });

  return response;
}

export function GET(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().GET(request, context);
}

export async function POST(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  const normalizedRequest = normalizeAuthRequest(request);
  const response = await authApiHandler().POST(normalizedRequest, context);
  return logForbiddenAuthResponse(normalizedRequest, response);
}

export async function PUT(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  const normalizedRequest = normalizeAuthRequest(request);
  const response = await authApiHandler().PUT(normalizedRequest, context);
  return logForbiddenAuthResponse(normalizedRequest, response);
}

export async function DELETE(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  const normalizedRequest = normalizeAuthRequest(request);
  const response = await authApiHandler().DELETE(normalizedRequest, context);
  return logForbiddenAuthResponse(normalizedRequest, response);
}

export async function PATCH(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  const normalizedRequest = normalizeAuthRequest(request);
  const response = await authApiHandler().PATCH(normalizedRequest, context);
  return logForbiddenAuthResponse(normalizedRequest, response);
}
