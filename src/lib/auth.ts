import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { emailOTP } from "better-auth/plugins";
import { AuthEmailService } from "@/emails/services/AuthEmailService";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

export const auth = betterAuth({
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
      allowedAttempts: 3,
      disableSignUp: false,

      async sendVerificationOTP({ email, otp, type }) {
        console.log("[AUTH] OTP REQUEST RECEIVED", { email, type });

        const isAllowed = await prisma.allowedUser.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { status: true },
        });
        const canReceiveOtp = Boolean(isAllowed) && existingUser?.status !== "REJECTED";

        console.log("[AUTH] Allowed user check:", {
          email,
          isAllowed: !!isAllowed,
          userStatus: existingUser?.status ?? null,
          canReceiveOtp,
        });

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
          console.log("[AUTH] BLOCKED: email not authorized for OTP");
          await prisma.verification.deleteMany({
            where: { identifier: `${type}-otp-${email.toLowerCase()}` },
          });
          return;
        }

        console.log("[AUTH] SENDING OTP EMAIL");

        try {
          await AuthEmailService.sendOtpEmail({ email, otp });
          console.log("[AUTH] OTP EMAIL SENT SUCCESSFULLY");
        } catch (err) {
          console.error("[AUTH] OTP EMAIL FAILED", err);
        }
      },
    }),
    nextCookies(),
  ],
});
