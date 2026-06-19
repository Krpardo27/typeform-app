"use client";

import { OTPInput, SlotProps } from "input-otp";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function Slot(props: SlotProps) {
  return (
    <div
      className={`
        relative flex h-12 w-12 items-center justify-center
        rounded-xl border text-xl font-semibold text-white
        transition-all duration-200
        ${props.isActive 
          ? "border-[#C8A96E] ring-4 ring-[#C8A96E]/20 bg-[#C8A96E]/5 scale-105" 
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
        }
      `}
    >
      {props.char ?? ""}
      {/* Efecto de cursor parpadeante moderno si está activo y vacío */}
      {props.isActive && !props.char && (
        <div className="absolute pointer-events-none h-5 w-0.5 bg-[#C8A96E] animate-pulse rounded-full" />
      )}
    </div>
  );
}

export function OtpInput({ value, onChange }: Props) {
  return (
    <OTPInput
      maxLength={6}
      value={value}
      onChange={onChange}
      containerClassName="flex justify-center gap-2.5"
      render={({ slots }) => (
        <>
          {slots.map((slot, idx) => (
            <Slot key={idx} {...slot} />
          ))}
        </>
      )}
    />
  );
}