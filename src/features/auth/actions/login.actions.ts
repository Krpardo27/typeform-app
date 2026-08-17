"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import {
  assertValidCsrfOrigin,
  ensureDeviceSessionId,
  getDeviceFingerprint,
  getRequestIpFromHeaders,
} from "@/lib/security/http";
import {
  AuthRateLimitError,
  enforceAuthRateLimit,
} from "@/lib/security/rate-limit";

const OTP_TYPE = "sign-in";
const REQUEST_OTP_ENDPOINT = "auth/request-otp";
const VERIFY_OTP_ENDPOINT = "auth/verify-otp";

function mapOtpVerificationError(error: unknown): Exclude<
  VerifyOtpActionResult["reason"],
  "accepted" | "rate-limited" | "unauthorized"
> {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code.toUpperCase()
      : "";

  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : "";

  if (code === "INVALID_OTP" || message.includes("invalid otp")) {
    return "invalid-otp";
  }

  if (code === "OTP_EXPIRED" || message.includes("expired")) {
    return "expired-otp";
  }

  if (code === "TOO_MANY_ATTEMPTS" || message.includes("too many attempts")) {
    return "too-many-attempts";
  }

  return "invalid-otp";
}

export type RequestOtpActionResult = {
  accepted: boolean;
  reason: "accepted" | "unauthorized" | "rate-limited";
  retryAfterSeconds?: number;
};

export type VerifyOtpActionResult = {
  accepted: boolean;
  reason:
    | "accepted"
    | "rate-limited"
    | "invalid-otp"
    | "expired-otp"
    | "too-many-attempts"
    | "unauthorized";
  retryAfterSeconds?: number;
};

class UnauthorizedEmailError extends Error {
  constructor() {
    super("Este email no esta autorizado para ingresar");
    this.name = "UnauthorizedEmailError";
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function deletePendingSignInOtp(email: string) {
  await prisma.verification.deleteMany({
    where: { identifier: `${OTP_TYPE}-otp-${email}` },
  });
}

async function assertCanUseOtp(emailInput: string) {
  const email = normalizeEmail(emailInput);

  if (!email) {
    throw new Error("Email invalido");
  }

  const [allowedUser, existingUser] = await Promise.all([
    prisma.allowedUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { status: true },
    }),
  ]);

  const canUseOtp = Boolean(allowedUser) && existingUser?.status !== "REJECTED";

  if (!canUseOtp) {
    await deletePendingSignInOtp(email);
    throw new UnauthorizedEmailError();
  }

  return email;
}

export async function requestOtpAction(
  email: string,
): Promise<RequestOtpActionResult> {
  const requestHeaders = await headers();
  assertValidCsrfOrigin(requestHeaders);

  const normalizedInputEmail = normalizeEmail(email);
  const ip = getRequestIpFromHeaders(requestHeaders);
  const sessionOrDeviceId = await ensureDeviceSessionId();
  const fallbackDeviceFingerprint = getDeviceFingerprint(requestHeaders);

  try {
    await enforceAuthRateLimit({
      ip,
      endpoint: REQUEST_OTP_ENDPOINT,
      user: normalizedInputEmail,
      email: normalizedInputEmail,
      deviceSessionId: sessionOrDeviceId || fallbackDeviceFingerprint,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      await createAuditLog({
        action: "OTP_REQUESTED",
        actor: { email: normalizedInputEmail },
        target: { type: "auth_otp", id: normalizedInputEmail },
        context: {
          metadata: {
            eventType: "OTP_RATE_LIMITED",
            endpoint: REQUEST_OTP_ENDPOINT,
            retryAfterSeconds: error.retryAfterSeconds,
          },
        },
      });

      return {
        accepted: false,
        reason: "rate-limited",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }

    throw error;
  }

  let normalizedEmail: string;

  try {
    normalizedEmail = await assertCanUseOtp(email);
  } catch (error) {
    // Caso esperado para evitar enumeracion de usuarios y evitar respuestas 500.
    if (error instanceof UnauthorizedEmailError) {
      return { accepted: false, reason: "unauthorized" };
    }

    throw error;
  }

  await auth.api.sendVerificationOTP({
    body: {
      email: normalizedEmail,
      type: OTP_TYPE,
    },
  });

  return { accepted: true, reason: "accepted" };
}

export async function verifyOtpAction(
  email: string,
  otp: string,
): Promise<VerifyOtpActionResult> {
  const requestHeaders = await headers();
  assertValidCsrfOrigin(requestHeaders);

  const normalizedInputEmail = normalizeEmail(email);
  const ip = getRequestIpFromHeaders(requestHeaders);
  const sessionOrDeviceId = await ensureDeviceSessionId();
  const fallbackDeviceFingerprint = getDeviceFingerprint(requestHeaders);

  try {
    await enforceAuthRateLimit({
      ip,
      endpoint: VERIFY_OTP_ENDPOINT,
      user: normalizedInputEmail,
      email: normalizedInputEmail,
      deviceSessionId: sessionOrDeviceId || fallbackDeviceFingerprint,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      await createAuditLog({
        action: "OTP_REQUESTED",
        actor: { email: normalizedInputEmail },
        target: { type: "auth_otp", id: normalizedInputEmail },
        context: {
          metadata: {
            eventType: "OTP_RATE_LIMITED",
            endpoint: VERIFY_OTP_ENDPOINT,
            retryAfterSeconds: error.retryAfterSeconds,
          },
        },
      });

      return {
        accepted: false,
        reason: "rate-limited",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }

    throw error;
  }

  let normalizedEmail: string;

  try {
    normalizedEmail = await assertCanUseOtp(email);
  } catch (error) {
    if (error instanceof UnauthorizedEmailError) {
      return { accepted: false, reason: "unauthorized" };
    }

    throw error;
  }

  try {
    await auth.api.signInEmailOTP({
      body: {
        email: normalizedEmail,
        otp,
      },
      headers: requestHeaders,
    });

    return { accepted: true, reason: "accepted" };
  } catch (error) {
    return {
      accepted: false,
      reason: mapOtpVerificationError(error),
    };
  }
}
