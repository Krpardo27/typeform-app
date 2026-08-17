"use client";

import { useEffect, useState } from "react";
import {
  LuArrowLeft,
  LuKeyRound,
  LuLoader,
  LuMail,
  LuRefreshCw,
  LuTriangle,
} from "react-icons/lu";
import { toast } from "sonner";

import { verifyOtpAction, requestOtpAction } from "../actions/login.actions";
import { loginCopy } from "./data";
import { OtpInput } from "./OtpInput";
import LoaderRedirect from "@/shared/ui/LoaderRedirect";

type OtpStepProps = {
  email: string;
  onBack: () => void;
};

export function OtpStep({ email, onBack }: OtpStepProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;

    const timer = setInterval(() => {
      setVerifyCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [verifyCooldown]);

  async function onSubmit() {
    if (verifyCooldown > 0) {
      const message = loginCopy.tooManyAttempts(verifyCooldown);
      setError(message);
      toast.error(message);
      return;
    }

    if (otp.length !== 6) {
      setError("Ingresa los 6 dígitos del código");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyOtpAction(email, otp);

      if (!result.accepted) {
        if (result.reason === "rate-limited") {
          const retryAfter = result.retryAfterSeconds ?? 60;
          const message = loginCopy.tooManyAttempts(retryAfter);

          setVerifyCooldown(retryAfter);
          setError(message);
          toast.error(message);
        } else if (result.reason === "invalid-otp") {
          setError(
            "El código que ingresaste es incorrecto. Intenta nuevamente.",
          );
        } else if (result.reason === "expired-otp") {
          setError("El código ha expirado. Solicita uno nuevo.");
        } else if (result.reason === "too-many-attempts") {
          setError(
            "Has superado el número máximo de intentos. Solicita un nuevo código.",
          );
        } else {
          setError(loginCopy.genericError);
        }

        setIsLoading(false);
        return;
      }

      setRedirecting(true);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      setError(rawMessage || loginCopy.genericError);
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) {
      const message = loginCopy.tooManyAttempts(resendCooldown);
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);

    try {
      const result = await requestOtpAction(email);

      if (!result.accepted && result.reason === "rate-limited") {
        const retryAfter = result.retryAfterSeconds ?? 60;
        const message = loginCopy.tooManyAttempts(retryAfter);

        setResendCooldown(retryAfter);
        setError(message);
        toast.error(message);
        return;
      }

      if (!result.accepted) {
        setError(loginCopy.genericError);
        toast.error(loginCopy.genericError);
        return;
      }

      setOtp("");
      toast.success("Te reenviamos un nuevo código de verificación");
    } catch {
      setError(loginCopy.genericError);
      toast.error(loginCopy.genericError);
    }
  }

  const maskedEmail = email.replace(/^(.{3}).*(@.*)$/, "$1••••••$2");

  if (redirecting) {
    return (
      <LoaderRedirect
        redirectTo="/workspaces/me"
        title="Acceso verificado"
        description="Estamos preparando tu espacio de trabajo."
      />
    );
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="group flex cursor-pointer items-center gap-2 text-xs font-medium text-black/45 transition-colors hover:text-black"
        >
          <LuArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Cambiar email
        </button>

        <div className="space-y-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#FF5C35]/10">
            <LuKeyRound className="size-5 text-[#FF5C35]" strokeWidth={1.8} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-black">
              Verifica tu email
            </h2>

            <p className="max-w-sm text-sm leading-6 text-black/50">
              Introduce el código de 6 dígitos que enviamos a tu correo
              electrónico.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-sm font-medium text-black/75">
            <LuMail className="size-4 text-black/35" />
            <span>{maskedEmail}</span>
          </div>
        </div>
      </div>

      {/* OTP */}
      <div className="space-y-3">
        <div className="flex justify-center">
          <OtpInput value={otp} onChange={setOtp} />
        </div>

        <p className="text-center text-[11px] text-black/35">
          El código es válido por un tiempo limitado.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-600">
          <LuTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PRIMARY ACTION */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || verifyCooldown > 0}
        className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#FF5C35] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#f4512b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <LuLoader className="size-4 animate-spin" />
            Verificando...
          </span>
        ) : verifyCooldown > 0 ? (
          `Reintentar en ${verifyCooldown}s`
        ) : (
          "Verificar código"
        )}
      </button>

      {/* RESEND */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-xs text-black/40">¿No recibiste el código?</span>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-black/65 transition-colors hover:text-[#FF5C35] disabled:cursor-not-allowed disabled:text-black/30"
        >
          <LuRefreshCw
            className={`size-3.5 ${
              resendCooldown > 0 ? "" : "transition-transform hover:rotate-45"
            }`}
          />

          {resendCooldown > 0
            ? `Puedes reenviar en ${resendCooldown}s`
            : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}
