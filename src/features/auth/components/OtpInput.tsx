"use client";

import type { Ref } from "react";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

type Props = {
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

function Slot({
  isActive,
  char,
  hasFakeCaret,
  invalid,
}: SlotProps & { invalid: boolean }) {
  return (
    <div
      className={`
        relative flex h-14 min-w-0 items-center justify-center
        rounded-md border text-2xl leading-none font-medium tabular-nums text-[#171717] 
        transition-colors duration-150 sm:h-15 motion-reduce:transition-none
        ${
          invalid
            ? "border-[#B42318] bg-[#FFF4F2] text-[#9B231B]"
            : isActive
              ? "border-[#FF5C35] bg-white"
              : char
                ? "border-[#FF5C35]/65 bg-[#FFF1EC]"
                : "border-[#FF5C35]/35 bg-white"
        }
        ${invalid ? "outline-[#B42318]" : "outline-[#FF5C35]"}
        ${isActive ? "outline-2" : "outline-0"}
      `}
    >
      {char}
      {hasFakeCaret && (
        <div
          className={`pointer-events-none absolute h-6 w-px animate-pulse motion-reduce:animate-none ${invalid ? "bg-[#B42318]" : "bg-[#A53318]"}`}
        />
      )}
    </div>
  );
}

export function OtpInput({
  id,
  inputRef,
  value,
  onChange,
  readOnly = false,
  invalid = false,
  describedBy,
}: Props) {
  return (
    <OTPInput
      id={id}
      ref={inputRef}
      name="otp"
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      spellCheck={false}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      pasteTransformer={(text) => text.replace(/[\s-]/g, "")}
      containerClassName={`w-full min-w-0 ${readOnly ? "opacity-60" : ""}`}
      render={({ slots }) => (
        <div
          aria-hidden="true"
          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3"
        >
          <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
            {slots.slice(0, 3).map((slot, idx) => (
              <Slot key={idx} {...slot} invalid={invalid} />
            ))}
          </div>
          <span
            className={`h-px w-2 ${invalid ? "bg-[#B42318]/50" : "bg-[#FF5C35]/50"}`}
          />
          <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
            {slots.slice(3).map((slot, idx) => (
              <Slot key={idx + 3} {...slot} invalid={invalid} />
            ))}
          </div>
        </div>
      )}
    />
  );
}
