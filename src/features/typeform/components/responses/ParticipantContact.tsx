import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

function getParticipantContact(response: MaskedTypeformResponse): string {
  const candidates = [...response.answers, ...response.hidden];

  const byQuestionHint = candidates.find((answer) => {
    const question = answer.question.toLowerCase();

    return question.includes("email") || question.includes("correo");
  });

  if (byQuestionHint?.value?.trim()) {
    return byQuestionHint.value.trim();
  }

  const byEmailPattern = candidates.find((answer) =>
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(answer.value),
  );

  if (byEmailPattern?.value?.trim()) {
    return byEmailPattern.value.trim();
  }

  return "Sin email visible";
}

export function ParticipantContact({
  response,
  contactOverride,
}: {
  response: MaskedTypeformResponse;
  contactOverride?: string;
}) {
  return <>{contactOverride ?? getParticipantContact(response)}</>;
}
