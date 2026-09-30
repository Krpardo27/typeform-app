import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

export function QuestionAnswerCard({
  answer,
}: {
  answer: MaskedTypeformResponse["answers"][number];
}) {
  return (
    <div
      className="
        grid gap-2 border-b border-[#E8E8E6] px-4 py-3 last:border-b-0
        md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)]
      "
    >
      <p className="text-xs font-medium leading-relaxed text-[#000000]/45">
        {answer.question}
      </p>

      <p className="wrap-break-word text-sm leading-relaxed text-[#111111]">
        {answer.value}
      </p>
    </div>
  );
}
