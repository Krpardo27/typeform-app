import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://forms-cl.prisa.media",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const DEVICE_COOKIE_NAME = "typeform_session";

function readCsvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(): string[] {
  const configured = [
    ...readCsvEnv("ALLOWED_ORIGINS"),
    process.env.NEXT_PUBLIC_APP_URL ?? "",
    process.env.BETTER_AUTH_URL ?? "",
    ...DEFAULT_ALLOWED_ORIGINS,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => normalizeOrigin(value) ?? value);

  return Array.from(new Set(configured));
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}

export function getRequestIpFromHeaders(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const candidates = [
    headers.get("x-real-ip"),
    headers.get("cf-connecting-ip"),
    headers.get("x-client-ip"),
  ];

  for (const candidate of candidates) {
    if (candidate?.trim()) return candidate.trim();
  }

  return "unknown";
}

export async function ensureDeviceSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_COOKIE_NAME)?.value;

  if (existing) return existing;

  const generatedId = randomUUID();
  cookieStore.set(DEVICE_COOKIE_NAME, generatedId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return generatedId;
}

export function getDeviceFingerprint(headers: Headers): string {
  const userAgent = headers.get("user-agent") ?? "unknown-ua";
  const acceptLanguage = headers.get("accept-language") ?? "unknown-lang";

  return createHash("sha256")
    .update(`${userAgent}|${acceptLanguage}`)
    .digest("hex");
}

export function assertValidCsrfOrigin(headers: Headers): void {
  const originHeader = headers.get("origin") ?? headers.get("referer");

  if (!originHeader) {
    throw new Error("Solicitud invalida: origen ausente");
  }

  const normalizedOrigin = normalizeOrigin(originHeader);

  if (!normalizedOrigin || !isAllowedOrigin(normalizedOrigin)) {
    throw new Error("Solicitud bloqueada por CSRF");
  }
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = isAllowedOrigin(origin);

  return {
    ...(isAllowed && origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function applyStandardSecurityHeaders(response: Response): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
}

export function getRequestOrigin(request: Request | NextRequest): string | null {
  const origin = request.headers.get("origin");
  return origin ? normalizeOrigin(origin) : null;
}
