import type { WinnerCandidate } from "./types";

export function deduplicateWinnerCandidates(candidates: WinnerCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.token}|${candidate.label}|${candidate.detail ?? ""}|${candidate.participantNumber ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getParticipantReference(
  candidate?: WinnerCandidate,
  fallback?: string,
) {
  const rawNumber = String(
    candidate?.participantNumber ?? candidate?.detail ?? "",
  )
    .replace(/^#/, "")
    .trim();

  if (rawNumber) {
    return `#${rawNumber}`;
  }

  return fallback ?? "Participante";
}

export function formatParticipantReferences(references: string[]) {
  if (references.length <= 1) {
    return references[0] ?? "";
  }

  if (references.length === 2) {
    return `${references[0]} y ${references[1]}`;
  }

  return `${references.slice(0, -1).join(", ")} y ${references.at(-1)}`;
}

export function areTokenSetsEqual(first: Set<string>, second: Set<string>) {
  if (first.size !== second.size) {
    return false;
  }

  for (const token of first) {
    if (!second.has(token)) {
      return false;
    }
  }

  return true;
}

export function getRandomIndexes(length: number) {
  const indexes = Array.from({ length }, (_, index) => index);

  for (let index = length - 1; index > 0; index -= 1) {
    const randomIndex = getSecureRandomInt(index + 1);
    [indexes[index], indexes[randomIndex]] = [
      indexes[randomIndex],
      indexes[index],
    ];
  }

  return indexes;
}

function getSecureRandomInt(maxExclusive: number) {
  const randomValue = new Uint32Array(1);
  const maxUint32 = 0x100000000;
  const limit = maxUint32 - (maxUint32 % maxExclusive);

  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= limit);

  return randomValue[0] % maxExclusive;
}
