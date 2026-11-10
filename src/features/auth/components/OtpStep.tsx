"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuLoader,
  LuCircleAlert,
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
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingOperation = useRef(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  const isBusy = isLoading || isResending;

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingOperation.current || redirecting) return;

    if (verifyCooldown > 0) {
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Completa los 6 dígitos del código para continuar.");
      inputRef.current?.focus();
      return;
    }

    pendingOperation.current = true;
    setIsLoading(true);
    setError(null);
    setResent(false);

    try {
      const result = await verifyOtpAction(email, otp);

      if (!result.accepted) {
        if (result.reason === "rate-limited") {
          const retryAfter = result.retryAfterSeconds ?? 60;
          const message = loginCopy.tooManyAttempts(retryAfter);

          setVerifyCooldown(retryAfter);
          setError(
            "Has realizado demasiados intentos. Espera antes de verificar de nuevo.",
          );
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
          setError(
            "No pudimos verificar el acceso. Intenta de nuevo o solicita otro código.",
          );
        }

        return;
      }

      setRedirecting(true);
    } catch {
      setError("No pudimos verificar el código. Intenta nuevamente.");
    } finally {
      pendingOperation.current = false;
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (pendingOperation.current || redirecting || resendCooldown > 0) return;

    pendingOperation.current = true;
    setIsResending(true);
    setError(null);
    setResent(false);

    try {
      const result = await requestOtpAction(email);

      if (!result.accepted && result.reason === "rate-limited") {
        const retryAfter = result.retryAfterSeconds ?? 60;
        const message = loginCopy.tooManyAttempts(retryAfter);

        setResendCooldown(retryAfter);
        setError("Has solicitado varios códigos. Espera antes de pedir otro.");
        toast.error(message);
        return;
      }

      if (!result.accepted) {
        setError(loginCopy.genericError);
        toast.error(loginCopy.genericError);
        return;
      }

      setOtp("");
      setResent(true);
      setResendCooldown(30);
      inputRef.current?.focus();
      toast.success("Te reenviamos un nuevo código de verificación");
    } catch {
      const message = "No pudimos reenviar el código. Intenta nuevamente.";
      setError(message);
      toast.error(message);
    } finally {
      pendingOperation.current = false;
      setIsResending(false);
    }
  }

  const emailSeparator = email.lastIndexOf("@");
  const localPart = email.slice(0, emailSeparator);
  const visibleCharacters = Math.min(3, Math.max(0, localPart.length - 1));
  const maskedEmail =
    emailSeparator > 0
      ? `${localPart.slice(0, visibleCharacters)}•••${email.slice(emailSeparator)}`
      : "•••";

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
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${inputId}-title`}
      className="space-y-7 text-[#171717]"
    >
      <header>
        <button
          type="button"
          onClick={onBack}
          disabled={isBusy}
          className="-ml-2 mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-[#595954] underline-offset-4 transition-colors hover:text-[#171717] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none"
        >
          <LuArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
          {loginCopy.otpBack}
        </button>

        <h2
          id={`${inputId}-title`}
          className="text-2xl leading-tight font-medium tracking-tight sm:text-3xl"
        >
          Revisa tu correo
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#595954]">
          Introduce el código de 6 dígitos que te enviamos.
        </p>

        <div className="mt-5">
          <p className="text-sm text-[#737373]">
            Enviado a
          </p>
          <p className="mt-1 text-sm leading-6 font-medium wrap-anywhere">
            {maskedEmail}
          </p>
        </div>
      </header>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <label htmlFor={inputId} className="text-sm font-medium">
            {loginCopy.otpLabel}
          </label>
          <span aria-hidden="true" className="text-[11px] text-[#595954]">
            6 dígitos
          </span>
        </div>
        <OtpInput
          id={inputId}
          inputRef={inputRef}
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setError(null);
            setResent(false);
          }}
          readOnly={isBusy}
          invalid={Boolean(error)}
          describedBy={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
        />
        <p
          id={`${inputId}-hint`}
          className="mt-3 text-sm leading-5 text-[#595954]"
        >
          Puedes pegar el código completo. Es válido durante 5 minutos.
        </p>

        <div aria-live="polite" aria-atomic="true">
          {error && (
            <p
              id={`${inputId}-error`}
              className="mt-4 flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm leading-5 text-[#9B231B]"
            >
              <LuCircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{error}</span>
            </p>
          )}
          {resent && (
            <p className="mt-4 flex items-start gap-2 text-sm leading-5 text-[#356044]">
              <LuCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Enviamos otro código. Usa el más reciente.
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isBusy || verifyCooldown > 0}
        aria-label={isLoading ? "Verificando código" : undefined}
        className="flex min-h-13 text-white w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-transparent bg-[#FF5C35] px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:border-[#D1D1CD] disabled:bg-[#F0F0ED] disabled:text-[#65655F] motion-reduce:transition-none"
      >
        {isLoading ? (
          <>
            <span>Verificando código…</span>
            <LuLoader
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            />
          </>
        ) : verifyCooldown > 0 ? (
          <span aria-live="off">Reintentar en {verifyCooldown}s</span>
        ) : (
          <>
            <span>Verificar y entrar</span>
            <LuArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </>
        )}
      </button>

      <footer className="border-t border-[#E8E8E6] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <p className="text-sm font-medium">¿No llegó el correo?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isBusy || resendCooldown > 0}
            aria-label={isResending ? "Reenviando código" : undefined}
            className="-ml-1 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-1 text-sm font-semibold text-[#171717] underline decoration-[#FF5C35] decoration-2 underline-offset-4 transition-colors hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:text-[#65655F] disabled:no-underline motion-reduce:transition-none"
          >
            {isResending ? (
              <>
                <LuLoader
                  aria-hidden="true"
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
                <span>Reenviando…</span>
              </>
            ) : resendCooldown > 0 ? (
              <span aria-live="off">Reenviar en {resendCooldown}s</span>
            ) : (
              loginCopy.otpResend
            )}
          </button>
        </div>
        <p className="text-sm leading-5 text-[#595954]">
          Revisa también la carpeta de spam.
        </p>
        <p role="status" className="sr-only">
          {isLoading
            ? "Verificando código."
            : isResending
              ? "Reenviando código."
              : ""}
        </p>
      </footer>
    </form>
  );
}
