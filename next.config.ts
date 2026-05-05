import type { NextConfig } from "next";

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy() {
  const authOrigin = normalizeOrigin(process.env.NEON_AUTH_BASE_URL);
  const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const connectSources = [
    "'self'",
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://*.tiles.mapbox.com",
    authOrigin,
    appOrigin,
  ].filter(Boolean);

  const scriptSources = ["'self'", "'unsafe-inline'", "https:"];
  if (process.env.NODE_ENV !== "production") {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `connect-src ${connectSources.join(" ")}`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    `script-src ${scriptSources.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-src 'self' https://accounts.google.com https://*.google.com",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    const contentSecurityPolicy = buildContentSecurityPolicy();
    const headerRules = [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/(trips|api)/(.*)",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
        ],
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headerRules.push({
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      });
    }

    return headerRules;
  },
};

export default nextConfig;
