import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  applyStandardSecurityHeaders,
  getCorsHeaders,
  getRequestOrigin,
} from "@/lib/security/http";

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    const origin = getRequestOrigin(request);
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204, headers: corsHeaders });
      applyStandardSecurityHeaders(response);
      return response;
    }

    const apiResponse = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      apiResponse.headers.set(key, value);
    }
    applyStandardSecurityHeaders(apiResponse);

    return apiResponse;
  }

  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });

  if (!session || session.user.status === "REJECTED") {
    const redirectResponse = NextResponse.redirect(
      new URL("/auth/login", request.url),
    );
    applyStandardSecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  const response = NextResponse.next();
  applyStandardSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/workspaces/:path*", "/api/:path*"],
};