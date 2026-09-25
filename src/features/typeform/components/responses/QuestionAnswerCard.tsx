import { LuEye, LuEyeOff } from "react-icons/lu";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

export function QuestionAnswerCard({
  responseToken,
  answer,
}: {
  responseToken: string;
  answer: MaskedTypeformResponse["answers"][number];
}) {
  return (
    <div
      key={`${responseToken}-${answer.id}`}
      className="
        rounded-xl
        border border-[#E8E8E6]
        bg-[#F7F7F6]
        p-3.5
      "
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#000000]/45">
          {answer.question}
        </p>

        {answer.masked ? (
          <span
            className="
              inline-flex shrink-0 items-center gap-1
              rounded-full
              border border-[#FF5C35]/30
              bg-[#FF5C35]/10
              px-2 py-0.5
              text-[10px] font-medium
              text-[#FF5C35]
            "
          >
            <LuEyeOff className="size-3" />
            Oculto
          </span>
        ) : (
          <span
            className="
              inline-flex shrink-0 items-center gap-1
              rounded-full
              border border-[#7C3AED]/30
              bg-[#7C3AED]/10
              px-2 py-0.5
              text-[10px] font-medium
              text-[#7C3AED]
            "
          >
            <LuEye className="size-3" />
            Visible
          </span>
        )}
      </div>

      <p className="mt-2 wrap-break-word text-sm text-[#000000]/80">
        {answer.value}
      </p>
    </div>
  );
}
