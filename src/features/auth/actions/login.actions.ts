"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OTP_TYPE = "sign-in";

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
    throw new Error("Este email no esta autorizado para ingresar");
  }

  return email;
}

export async function requestOtpAction(email: string) {
  const normalizedEmail = await assertCanUseOtp(email);

  await auth.api.sendVerificationOTP({
    body: {
      email: normalizedEmail,
      type: OTP_TYPE,
    },
  });
}

export async function verifyOtpAction(email: string, otp: string) {
  const normalizedEmail = await assertCanUseOtp(email);

  await auth.api.signInEmailOTP({
    body: {
      email: normalizedEmail,
      otp,
    },
    headers: await headers(),
  });
}
