"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuKeyRound,
  LuMail,
  LuArrowLeft,
  LuRefreshCw,
  LuLoader,
  LuTriangle,
} from "react-icons/lu";

import { verifyOtpAction, requestOtpAction } from "../actions/login.actions";
import { loginCopy } from "./data";
import { OtpInput } from "./OtpInput";
import { AppLoader } from "@/shared/components/AppLoader";
import { useMinDuration } from "@/shared/hooks/useMinDuration";

type OtpStepProps = {
  email: string;
  onBack: () => void;
};

export function OtpStep({ email, onBack }: OtpStepProps) {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnteringWorkspace, setIsEnteringWorkspace] = useState(false);

  const showLoader = useMinDuration(isEnteringWorkspace, 1500);

  async function onSubmit() {
    if (otp.length !== 6) {
      setError("Ingresa los 6 dígitos del código");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verifyOtpAction(email, otp);
      setIsEnteringWorkspace(true);

      setTimeout(() => {
        router.replace("/workspaces");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : loginCopy.genericError);
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    await requestOtpAction(email);
  }

  const maskedEmail = email.replace(/^(.{3}).*(@.*)$/, "$1••••••$2");

  return (
    <div className="space-y-8">
      <AppLoader
        isOpen={showLoader}
        title="Acceso verificado"
        description="Estamos preparando tu workspace seguro. Esto tomara solo un momento."
      />

      {/* HEADER */}
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#C8A96E]/10 border border-[#C8A96E]/20">
          <LuKeyRound className="size-6 text-[#C8A96E]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            Código de verificación
          </h2>

          <p className="text-sm text-zinc-400">
            Te enviamos un código de 6 dígitos a
          </p>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#C8A96E]">
            <LuMail className="size-3.5" />
            {maskedEmail}
          </div>
        </div>
      </div>

      {/* OTP INPUT (FOCUS BLOCK) */}
      <div className="flex justify-center">
        <OtpInput value={otp} onChange={setOtp} />
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          <LuTriangle className="size-3.5" />
          {error}
        </div>
      )}

      {/* PRIMARY ACTION */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full rounded-xl bg-[#C8A96E] py-3 text-sm font-semibold text-black transition hover:bg-[#d9bc82] active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LuLoader className="size-4 animate-spin" />
            Verificando
          </span>
        ) : (
          "Continuar"
        )}
      </button>

      {/* SECONDARY ACTIONS */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-400 transition hover:text-white"
        >
          <LuArrowLeft className="size-3.5" />
          Cambiar email
        </button>

        <button
          type="button"
          onClick={handleResend}
          className="flex items-center gap-1.5 text-zinc-400 transition hover:text-[#C8A96E]"
        >
          <LuRefreshCw className="size-3.5" />
          Reenviar
        </button>
      </div>
    </div>
  );
}
