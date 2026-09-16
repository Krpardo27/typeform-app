"use client";

import { useState } from "react";
import { LuClipboardPaste } from "react-icons/lu";

import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";

export function LoginView() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F7F6] px-4 py-6 text-[#111111] sm:py-8">
      <section
        className="
          w-full
          max-w-md
          rounded-xl
          border border-[#D1D1CD]
          bg-white
          p-6
          shadow-2xl
          sm:p-8
        "
      >
        <div className="mb-8 border-b border-[#D1D1CD] pb-6">
          <div className="mb-5 flex items-center gap-4">
            <div
              className="
                flex size-12
                shrink-0
                items-center justify-center
                rounded-2xl
                border border-[#FF5C35]/40
                bg-[#FFF1EC]
              "
            >
              <LuClipboardPaste className="size-6 text-[#FF5C35]" />
            </div>

            <h1 className="text-2xl font-bold uppercase tracking-tight text-[#111111]">
              Plataforma de Formularios
            </h1>
          </div>

          <div className="mt-6 flex gap-2.5">
            <div
              className="
                h-1.5 flex-1
                rounded-full
                bg-[#FF5C35]
                shadow-[0_2px_8px_-3px_rgba(255,92,53,0.5)]
              "
            />

            <div
              className={`
                h-1.5 flex-1
                rounded-full
                transition-all duration-300
                ${
                  email
                    ? "bg-[#FF5C35] shadow-[0_2px_8px_-3px_rgba(255,92,53,0.5)]"
                    : "bg-[#D1D1CD]"
                }
              `}
            />
          </div>
        </div>

        {email ? (
          <OtpStep email={email} onBack={() => setEmail(null)} />
        ) : (
          <EmailStep onSuccess={setEmail} />
        )}
      </section>
    </main>
  );
}
