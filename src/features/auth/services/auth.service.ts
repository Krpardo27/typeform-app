import { authClient } from "@/lib/auth-client";

export const AuthService = {
  async sendOtp(email: string) {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (error) {
      throw new Error("No se pudo enviar el código de verificación.");
    }
  },

  async verifyOtp(email: string, otp: string) {
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp,
    });

    if (error) {
      const errorCode = (error.code ?? "").toUpperCase();
      const errorMessage = (error.message ?? "").toLowerCase();

      switch (errorCode) {
        case "INVALID_OTP":
          throw new Error("El código que ingresaste es incorrecto. Intenta nuevamente.");

        case "OTP_EXPIRED":
          throw new Error("El código ha expirado. Solicita uno nuevo.");

        case "TOO_MANY_ATTEMPTS":
          throw new Error(
            "Has superado el número máximo de intentos. Solicita un nuevo código.",
          );

        default:
          if (errorMessage.includes("invalid otp")) {
            throw new Error("El código que ingresaste es incorrecto. Intenta nuevamente.");
          }

          throw new Error("El código no es válido o ha expirado.");
      }
    }
  },
};