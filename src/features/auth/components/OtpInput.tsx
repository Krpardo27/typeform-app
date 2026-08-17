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
        rounded-xl border text-xl font-semibold text-[#000000]
        transition-all duration-200
        ${props.isActive 
          ? "border-[#FF5C35] ring-4 ring-[#FF5C35]/20 bg-[#FF5C35]/5 scale-105" 
          : "border-slate-300 bg-[#FFFFFF] hover:border-[#FF5C35]/40"
        }
      `}
    >
      {props.char ?? ""}
      {/* Efecto de cursor parpadeante moderno si está activo y vacío */}
      {props.isActive && !props.char && (
        <div className="absolute pointer-events-none h-5 w-0.5 rounded-full bg-[#FF5C35] animate-pulse" />
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