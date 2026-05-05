import { authApiHandler } from "@neondatabase/auth/next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId, logError, logInfo, logWarn, timeAsync } from "@/lib/observability";

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

  logError("auth.forbidden", {
    requestId: getRequestId(request.headers),
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

function buildRateLimitedResponse(request: Request, retryAfterSeconds: number) {
  const requestId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);

  logWarn("auth.rate_limited", {
    requestId,
    ip,
    method: request.method,
    url: request.url,
    retryAfterSeconds,
  });

  return Response.json(
    { error: "Too many authentication requests. Please wait and try again.", requestId },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}

async function runAuthMutation(method: string, request: Request, context: AuthContext) {
  const requestId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit({
    key: `auth:${method}:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return buildRateLimitedResponse(request, limit.retryAfterSeconds);
  }

  const normalizedRequest = normalizeAuthRequest(request);
  const { durationMs, result } = await timeAsync(async () => {
    if (method === "POST") return authApiHandler().POST(normalizedRequest, context);
    if (method === "PUT") return authApiHandler().PUT(normalizedRequest, context);
    if (method === "DELETE") return authApiHandler().DELETE(normalizedRequest, context);
    return authApiHandler().PATCH(normalizedRequest, context);
  });

  logInfo("auth.request", {
    requestId,
    ip,
    method,
    url: request.url,
    status: result.status,
    durationMs,
  });

  return logForbiddenAuthResponse(normalizedRequest, result);
}

export function GET(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return authApiHandler().GET(request, context);
}

export function POST(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return runAuthMutation("POST", request, context);
}

export function PUT(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return runAuthMutation("PUT", request, context);
}

export function DELETE(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return runAuthMutation("DELETE", request, context);
}

export function PATCH(request: Request, context: AuthContext) {
  if (!process.env.NEON_AUTH_BASE_URL) return missingAuthEnv();
  return runAuthMutation("PATCH", request, context);
}
