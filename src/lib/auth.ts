import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { emailOTP } from "better-auth/plugins";
import { AuthEmailService } from "@/emails/services/AuthEmailService";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { getAllowedOrigins } from "@/lib/security/http";

export const auth = betterAuth({
  trustedOrigins: getAllowedOrigins(),
  rateLimit: {
    enabled: true,
    window: 300,
    max: 5,
    customRules: {
      "/email-otp/send-verification-otp": { window: 300, max: 5 },
      "/sign-in/email-otp": { window: 300, max: 5 },
      "/email-otp/check-verification-otp": { window: 300, max: 5 },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      rateLimit: {
        window: 300,
        max: 5,
      },
      disableSignUp: false,

      async sendVerificationOTP({ email, otp, type }) {
        const isAllowed = await prisma.allowedUser.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { status: true },
        });
        const canReceiveOtp = Boolean(isAllowed) && existingUser?.status !== "REJECTED";

        await createAuditLog({
          action: "OTP_REQUESTED",
          actor: { email },
          target: { type: "auth_otp", id: email.toLowerCase() },
          context: {
            metadata: {
              type,
              allowed: canReceiveOtp,
            },
          },
        });

        if (!canReceiveOtp) {
          await prisma.verification.deleteMany({
            where: { identifier: `${type}-otp-${email.toLowerCase()}` },
          });
          return;
        }

        try {
          await AuthEmailService.sendOtpEmail({ email, otp });
        } catch (err) {
          console.error("[AUTH] OTP EMAIL FAILED", err instanceof Error ? err.message : "unknown");
        }
      },
    }),
    nextCookies(),
  ],
});
