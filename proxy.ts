import { NextResponse, type NextRequest } from "next/server";

import { refreshAdminSession } from "@/lib/supabase/proxy";

const isAdminPath = (pathname: string) =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/api/admin") ||
  pathname === "/submit-program" ||
  pathname.startsWith("/auth");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  /* ---- Admin session refresh (original proxy logic) ---- */
  if (isAdminPath(pathname)) {
    return refreshAdminSession(request, nonce);
  }

  /* ---- Per-request nonce CSP for all other page routes ---- */
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    /* Admin paths — session refresh */
    "/admin/:path*",
    "/api/admin/:path*",
    "/submit-program",
    "/auth/:path*",
    /* All page routes for CSP nonce — exclude static assets and API routes */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
