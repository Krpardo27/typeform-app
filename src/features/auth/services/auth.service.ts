import { authClient } from "@/lib/auth-client";

export const AuthService = {
  async sendOtp(email: string) {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (error) {
      throw new Error(error.message ?? "No se pudo enviar el código");
    }
  },

  async verifyOtp(email: string, otp: string) {
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      throw new Error(error.message ?? "Código inválido o expirado");
    }
  },
};
