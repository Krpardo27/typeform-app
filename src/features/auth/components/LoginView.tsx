"use client";

import { useState } from "react";
import { LuClipboardPaste } from "react-icons/lu";

import { EmailStep } from "./EmailStep";
import { OtpStep } from "./OtpStep";

export function LoginView() {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] px-4 font-sans antialiased text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800/50 bg-[#141414] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 border-b border-zinc-800/50 pb-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
              <LuClipboardPaste className="size-6 text-[#C8A96E]" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Plataforma de Formularios
              </h1>
              <p className="text-sm text-zinc-400">
                Administración interna Typeform
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2.5">
            <div className="h-1.5 flex-1 rounded-full bg-[#C8A96E] shadow-sm shadow-[#C8A96E]/20" />
            <div
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                email ? "bg-[#C8A96E] shadow-sm shadow-[#C8A96E]/20" : "bg-zinc-800"
              }`}
            />
          </div>
        </div>

        {email ? (
          <OtpStep email={email} onBack={() => setEmail(null)} />
        ) : (
          <EmailStep onSuccess={setEmail} />
        )}
      </div>
    </div>
  );
}