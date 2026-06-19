"use client";

import { useState } from "react";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  async function onSubmit(values: EmailFormValues) {
    setIsLoading(true);
    setServerMessage(null);
    try {
      await requestOtpAction(values.email);
    } catch {
      // Intencional para evitar enumeración
    } finally {
      setIsLoading(false);
      setServerMessage(loginCopy.genericError);
      onSuccess(values.email);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-zinc-400">
          <LuMail className="size-4 text-zinc-500" />
          {loginCopy.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          placeholder={loginCopy.emailPlaceholder}
          {...register("email")}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white placeholder-zinc-600 transition-all focus:border-[#C8A96E] focus:outline-none focus:ring-4 focus:ring-[#C8A96E]/10"
        />
        {errors.email && (
          <p className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pl-1 pt-1">
            <LuTriangle className="size-3.5" />
            {errors.email.message}
          </p>
        )}
      </div>

      {serverMessage && (
        <p className="text-sm text-zinc-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50 text-center">
          {serverMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-[#C8A96E] py-3 text-sm font-semibold text-neutral-950 transition-all hover:bg-[#d9bc82] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[#C8A96E]/10"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LuLoader className="animate-spin size-4 text-neutral-950" />
            Enviando...
          </span>
        ) : (
          loginCopy.emailSubmit
        )}
      </button>
    </form>
  );
}