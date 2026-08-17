"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuMail, LuLoader, LuTriangle } from "react-icons/lu";

import { emailSchema, type EmailFormValues } from "../schemas/login.schema";
import { requestOtpAction } from "../actions/login.actions";
import { loginCopy } from "./data";

type EmailStepProps = {
  onSuccess: (email: string) => void;
};

export function EmailStep({ onSuccess }: EmailStepProps) {
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
    if (retryAfterSeconds > 0) {
      setServerMessage(loginCopy.tooManyAttempts(retryAfterSeconds));
      return;
    }

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
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#111111]/55"
        >
          <LuMail className="size-4 text-[#FF5C35]" />
          {loginCopy.emailLabel}
        </label>

        <input
          id="email"
          type="email"
          placeholder={loginCopy.emailPlaceholder}
          {...register("email")}
          className="
            w-full 
            rounded-xl
            border border-[#E8E8E6]
            bg-white
            px-4 py-3
            text-sm text-[#111111]
            shadow-[0_2px_8px_-6px_rgba(0,0,0,0.15)]
            outline-none
            transition-all duration-200
            placeholder:text-[#111111]/35
            hover:border-[#D8D8D5]
            focus:border-[#FF5C35]
            focus:ring-4
            focus:ring-[#FF5C35]/10
          "
        />

        {errors.email && (
          <p className="flex items-center gap-1.5 pl-1 pt-1 text-xs font-medium text-rose-500">
            <LuTriangle className="size-3.5" />
            {errors.email.message}
          </p>
        )}
      </div>

      {serverMessage && (
        <div className="rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] p-3.5 text-center shadow-[0_4px_12px_-10px_rgba(0,0,0,0.2)]">
          <p className="text-sm leading-relaxed text-[#111111]/65">
            {serverMessage}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || retryAfterSeconds > 0}
        className="
          w-full
          cursor-pointer
          rounded-xl
          bg-[#FF5C35]
          px-4 py-3
          text-sm font-semibold
          text-white
          shadow-[0_8px_20px_-8px_rgba(255,92,53,0.45)]
          transition-all duration-200
          hover:-translate-y-0.5
          hover:bg-[#F6532D]
          hover:shadow-[0_12px_24px_-10px_rgba(255,92,53,0.5)]
          active:translate-y-0
          active:scale-[0.99]
          disabled:pointer-events-none
          disabled:cursor-not-allowed
          disabled:opacity-50
          disabled:shadow-none
        "
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LuLoader className="size-4 animate-spin" />
            Enviando...
          </span>
        ) : retryAfterSeconds > 0 ? (
          `Reintenta en ${retryAfterSeconds}s`
        ) : (
          loginCopy.emailSubmit
        )}
      </button>
    </form>
  );
}
