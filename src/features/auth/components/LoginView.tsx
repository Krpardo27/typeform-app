"use client";

import { useState } from "react";
import { LuClipboardPaste } from "react-icons/lu";

import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";

export function LoginView() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F6] px-4 text-[#111111]">
      <section
        className="
          w-full
          max-w-md
          rounded-3xl
          border border-[#E8E8E6]
          bg-white
          p-8
          shadow-[0_20px_50px_-24px_rgba(0,0,0,0.22)]
        "
      >
        <div className="mb-8 border-b border-[#E8E8E6] pb-6">
          <div className="mb-5 flex items-center gap-4">
            <div
              className="
                flex size-12
                items-center justify-center
                rounded-2xl
                border border-[#FFE1D7]
                bg-[#FFF1EC]
              "
            >
              <LuClipboardPaste className="size-6 text-[#FF5C35]" />
            </div>

            <h1 className="text-xl font-bold uppercase tracking-tight text-[#111111]">
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
                    : "bg-[#E8E8E6]"
                }
              `}
            />
          </div>
        </div>

        {email ? (
          <OtpStep
            email={email}
            onBack={() => setEmail(null)}
          />
        ) : (
          <EmailStep onSuccess={setEmail} />
        )}
      </section>
    </main>
  );
}