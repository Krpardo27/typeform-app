"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuArrowRight, LuCircleAlert, LuLoader } from "react-icons/lu";

import { emailSchema, type EmailFormValues } from "../schemas/login.schema";
import { requestOtpAction } from "../actions/login.actions";
import { loginCopy } from "./data";

type EmailStepProps = {
  onSuccess: (email: string) => void;
};

export function EmailStep({ onSuccess }: EmailStepProps) {
  const inputId = useId();
  const pendingRequest = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRetryAfterSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  async function onSubmit(values: EmailFormValues) {
    if (pendingRequest.current) return;

    if (retryAfterSeconds > 0) {
      setServerMessage(loginCopy.tooManyAttempts(retryAfterSeconds));
      return;
    }

    pendingRequest.current = true;
    setIsLoading(true);
    setServerMessage(null);

    try {
      const result = await requestOtpAction(values.email);

      if (result.accepted) {
        setRetryAfterSeconds(0);
        onSuccess(values.email);
      } else if (result.reason === "rate-limited") {
        const retryAfter = result.retryAfterSeconds ?? 60;
        setRetryAfterSeconds(retryAfter);
        setServerMessage(loginCopy.tooManyAttempts(retryAfter));
      } else {
        setServerMessage(loginCopy.genericError);
      }
    } catch {
      setServerMessage("No pudimos procesar tu solicitud. Intenta nuevamente.");
    } finally {
      pendingRequest.current = false;
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
      aria-labelledby={`${inputId}-title`}
      className="space-y-7"
    >
      <div>
        <h2 id={`${inputId}-title`} className="text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
          Iniciar sesión
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#595954]">
          Te enviaremos un código a tu correo para entrar.
        </p>
        <p role="status" className="sr-only">
          {isLoading ? "Enviando el código a tu correo." : ""}
        </p>
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="mb-3 block text-sm font-medium text-[#171717]"
        >
          {loginCopy.emailLabel}
        </label>

        <input
          id={inputId}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={isLoading}
          placeholder={loginCopy.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={`${inputId}-hint${errors.email ? ` ${inputId}-error` : ""}`}
          {...register("email")}
          className="min-h-14 w-full min-w-0 rounded-t-sm border-0 border-b-2 border-[#B8B8B0] bg-[#F5F5F2] px-3 py-3 text-base text-[#171717] outline-none transition-colors placeholder:text-[#767670] focus:border-[#FF5C35] focus:bg-[#FFF8F5] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35] read-only:opacity-60 aria-invalid:border-[#B42318] motion-reduce:transition-none"
        />
        <p id={`${inputId}-hint`} className="mt-3 text-sm leading-5 text-[#595954]">
          Ingresa el correo con el que te dieron acceso.
        </p>
        {errors.email && (
          <p id={`${inputId}-error`} role="alert" className="mt-3 flex items-start gap-2 text-sm leading-5 text-[#9B231B]">
            <LuCircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{errors.email.message}</span>
          </p>
        )}
      </div>

      {serverMessage && (
        <p role="alert" className="border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm leading-5 text-[#9B231B]">
          {serverMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || retryAfterSeconds > 0}
        className="flex min-h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-transparent bg-[#FF5C35] px-4 py-3.5 text-left text-sm font-semibold text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717] disabled:cursor-not-allowed disabled:border-[#D1D1CD] disabled:bg-[#F0F0ED] disabled:text-[#65655F] motion-reduce:transition-none"
      >
        {isLoading ? (
          <>
            <span>Enviando código…</span>
            <LuLoader aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          </>
        ) : retryAfterSeconds > 0 ? (
          <span aria-live="off">Reintenta en {retryAfterSeconds}s</span>
        ) : (
          <>
            <span>{loginCopy.emailSubmit}</span>
            <LuArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </>
        )}
      </button>

    </form>
  );
}
