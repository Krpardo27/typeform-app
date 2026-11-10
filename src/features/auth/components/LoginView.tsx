"use client";

import { useState } from "react";
import { LuCheck } from "react-icons/lu";

import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";

export function LoginView() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F7F6] px-5 text-[#171717] sm:px-10">
      <header className="mx-auto w-full max-w-5xl border-b border-[#D1D1CD] py-6 sm:py-8">
        <h1 className="border-l-[3px] border-[#FF5C35] pl-3 text-lg leading-tight font-medium tracking-tight sm:text-xl">
          <span className="block">Plataforma de</span>
          <span className="block">Formularios</span>
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center py-10 sm:py-14">
        <section
          aria-label="Iniciar sesión"
          className="w-full max-w-md rounded-md border border-[#FF5C35]/45 p-5 sm:p-7"
        >
          <ol
            aria-label="Pasos de acceso"
            className={`relative mb-8 grid grid-cols-2 gap-6 before:absolute before:top-4 before:right-4 before:left-4 before:h-px ${email ? "before:bg-[#FF5C35]" : "before:bg-[#FF5C35]/25"}`}
          >
            <li
              aria-current={!email ? "step" : undefined}
              className="relative flex flex-col items-start gap-3"
            >
              <span
                aria-hidden="true"
                className={`flex size-8 items-center justify-center rounded-full border border-[#FF5C35] text-sm font-semibold tabular-nums ${email ? "bg-[#F7F7F6] text-[#A53318]" : "bg-[#FF5C35] text-white"}`}
              >
                {email ? <LuCheck className="size-4" strokeWidth={2} /> : "01"}
              </span>
              <span className={`text-sm ${email ? "text-[#595954]" : "font-semibold text-[#171717]"}`}>
                Tu correo
                {email && <span className="sr-only">, completado</span>}
              </span>
            </li>
            <li
              aria-current={email ? "step" : undefined}
              className="relative flex flex-col items-end gap-3"
            >
              <span
                aria-hidden="true"
                className={`flex size-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums ${email ? "border-[#FF5C35] bg-[#FF5C35] text-white" : "border-[#FF5C35]/40 bg-[#F7F7F6] text-[#595954]"}`}
              >
                02
              </span>
              <span className={`text-right text-sm ${email ? "font-semibold" : "text-[#595954]"}`}>
                Verificación
                {!email && <span className="sr-only">, pendiente</span>}
              </span>
            </li>
          </ol>

          {email ? (
            <OtpStep email={email} onBack={() => setEmail(null)} />
          ) : (
            <EmailStep onSuccess={setEmail} />
          )}

          {!email && (
            <p className="mt-8 border-t border-[#D1D1CD] pt-5 text-sm leading-5 text-[#595954]">
              Si aún no tienes acceso, contacta al administrador de tu equipo.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
