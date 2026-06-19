"use client";

import { AuthService } from "../services/auth.service";

export async function requestOtpAction(email: string) {
  await AuthService.sendOtp(email);
}

export async function verifyOtpAction(email: string, otp: string) {
  await AuthService.verifyOtp(email, otp);
}
