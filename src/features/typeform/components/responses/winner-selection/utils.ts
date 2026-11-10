import type { WinnerCandidate } from "./types";
import type {
  TypeformFormDetail,
  TypeformResponseItem,
  mapMaskedTypeformResponses,
} from "@/features/typeform/services/typeform.service";

type ProfileField = {
  id?: string;
  ref?: string;
  title?: string;
  type?: string;
  fields?: ProfileField[];
  properties?: { fields?: ProfileField[] };
};

function profileKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es").replace(/[_-]+/g, " ");
}

type WinnerCandidateProfile = Partial<Pick<WinnerCandidate, "label" | "email" | "region" | "city">>;

// Coincidencia exacta tras normalizar; jamás aceptar sufijos libres ni devolver
// el texto del participante. Solo se serializan etiquetas de este catálogo.
const SAFE_REGIONS = [
  ["Región de Arica y Parinacota", "Arica y Parinacota"],
  ["Región de Tarapacá", "Tarapacá"],
  ["Región de Antofagasta", "Antofagasta"],
  ["Región de Atacama", "Atacama"],
  ["Región de Coquimbo", "Coquimbo"],
  ["Región de Valparaíso", "Valparaíso"],
  ["Región Metropolitana de Santiago", "Metropolitana", "Región Metropolitana", "Metropolitana de Santiago"],
  ["Región del Libertador General Bernardo O'Higgins", "O'Higgins", "Región de O'Higgins", "Libertador General Bernardo O'Higgins"],
  ["Región del Maule", "Maule"],
  ["Región de Ñuble", "Ñuble"],
  ["Región del Biobío", "Biobío", "Bío Bío", "Región del Bío Bío"],
  ["Región de La Araucanía", "La Araucanía", "Araucanía"],
  ["Región de Los Ríos", "Los Ríos"],
  ["Región de Los Lagos", "Los Lagos"],
  ["Región de Aysén del General Carlos Ibáñez del Campo", "Aysén", "Región de Aysén", "Aysén del General Carlos Ibáñez del Campo"],
  ["Región de Magallanes y de la Antártica Chilena", "Magallanes", "Región de Magallanes", "Magallanes y de la Antártica Chilena"],
] as const;

function regionKey(value: string) {
  return profileKey(value).replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

const safeRegionLabels = new Map<string, string>(SAFE_REGIONS.flatMap(([label, ...aliases]) =>
  [label, ...aliases].map((alias) => [regionKey(alias), label] as const),
));

function maskProfilePrefix(value: string | undefined, maximum: number, suffix: string) {
  const characters = Array.from(value?.trim() ?? "");
  if (!characters.length) return undefined;
  // Ocultar al menos un carácter, incluso en nombres/locales de 1–2 letras.
  return characters.slice(0, Math.min(maximum, characters.length - 1)).join("") + suffix;
}

/** Única proyección de perfiles destinada al cliente, aplicada en el servidor.
 * Nombre y correo permanecen ocultos; región y comuna son visibles.
 */
export function maskWinnerCandidateProfile(profile: WinnerCandidateProfile): WinnerCandidateProfile {
  const local = profile.email?.trim().split("@")[0];
  return {
    label: maskProfilePrefix(profile.label, 2, "****"),
    email: maskProfilePrefix(local, 3, "*****"),
    region: profile.region ? safeRegionLabels.get(regionKey(profile.region)) : undefined,
    city: profile.city?.trim() || undefined,
  };
}

/** Proyección pura usada en el servidor: no devuelve answers, hidden ni fechas.
 * El mapeador se inyecta para no importar dependencias de Node en el cliente.
 */
export function getWinnerCandidateProfiles(
  form: TypeformFormDetail,
  responses: TypeformResponseItem[],
  mapResponses: typeof mapMaskedTypeformResponses,
) {
  const fields: ProfileField[] = [];
  function visitFields(items: ProfileField[]) {
    for (const field of items) {
      fields.push(field);
      visitFields(field.properties?.fields ?? field.fields ?? []);
    }
  }
  visitFields((form.fields ?? []) as ProfileField[]);
  const byId = new Map(fields.filter((field) => field.id).map((field) => [field.id, field]));
  const byRef = new Map(fields.filter((field) => field.ref).map((field) => [field.ref, field]));

  return new Map(responses.map((response) => {
    const answers: NonNullable<TypeformResponseItem["answers"]> = [];
    const answerFields: ProfileField[] = [];
    function visitAnswers(items: NonNullable<TypeformResponseItem["answers"]>) {
      for (const answer of items) {
        const field = byId.get(answer.field?.id) ?? byRef.get(answer.field?.ref);
        answers.push(answer);
        answerFields.push({ ...field, ref: [field?.ref, answer.field?.ref].filter(Boolean).join(" ") });
        if (Array.isArray(answer.answers)) visitAnswers(answer.answers);
        // Typeform también puede entregar address/contact_info como objetos.
        for (const kind of ["address", "contact_info"] as const) {
          const compound = answer[kind];
          if (!compound || typeof compound !== "object" || Array.isArray(compound)) continue;
          for (const [key, value] of Object.entries(compound)) {
            if (typeof value !== "string" || !value.trim()) continue;
            answers.push({ type: "text", text: value });
            answerFields.push({ ref: key });
          }
        }
      }
    }
    visitAnswers(response.answers ?? []);
    const mapped = mapResponses({ ...form, fields }, [{ ...response, answers }], {
      unmaskTokens: new Set([response.token]),
    })[0];
    const values = mapped.answers.map((answer, index) => ({
      key: profileKey([answerFields[index]?.title, answerFields[index]?.ref,
        answerFields[index]?.type, answers[index]?.field?.type, answer.answerType].filter(Boolean).join(" ")),
      value: answer.value.trim(),
    })).filter(({ value }) => value && value !== "Sin respuesta");
    const find = (pattern: RegExp) => values.find(({ key }) => pattern.test(key))?.value;
    const fullName = find(/\b(nombre completo|full name)\b/);
    const firstName = values.find(({ key }) =>
      /\b(nombre|nombres|first name|given name|name)\b/.test(key) &&
      !/\b(apellido|apellidos|last name|family name)\b/.test(key),
    )?.value;
    const lastName = find(/\b(apellido|apellidos|last name|family name)\b/);
    const name = fullName ?? [firstName, lastName].filter((value, index, list) => value && list.indexOf(value) === index).join(" ");
    return [response.token, {
      label: name || undefined,
      email: find(/\b(email|e mail|correo)\b/),
      region: find(/\bregion\b/) ?? find(/\b(state|province|provincia|estado)\b/),
      city: find(/\b(ciudad|city|localidad|town)\b/) ?? find(/\b(comuna|municipio)\b/),
    }] as const;
  }));
}

export function deduplicateWinnerCandidates(candidates: WinnerCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = candidate.token;

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

  if (/^\d+$/.test(rawNumber)) {
    return `#${rawNumber}`;
  }

  // Nunca usar un token interno como referencia visible.
  return fallback && /^#\d+$/.test(fallback) ? fallback : "Participante";
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

export function filterWinnerCandidates(
  candidates: WinnerCandidate[],
  query: string,
  regionFilter: string,
) {
  const normalized = query.trim().toLocaleLowerCase("es");
  const numericQuery = normalized.replace(/^#/, "");
  const isNumericQuery = /^\d+$/.test(numericQuery);

  return candidates.filter((candidate) => {
    if (regionFilter && candidate.region !== regionFilter) return false;
    if (!normalized) return true;

    if (isNumericQuery) {
      const number = String(candidate.participantNumber ?? candidate.detail ?? "")
        .trim().replace(/^#/, "");
      return /^\d+$/.test(number) &&
        number.replace(/^0+(?=\d)/, "") === numericQuery.replace(/^0+(?=\d)/, "");
    }

    return [candidate.label, candidate.email, candidate.region,
      candidate.city, candidate.comuna]
      .join(" ")
      .toLocaleLowerCase("es")
      .includes(normalized);
  });
}

export function getSafeRandomWinnerCount(value: string, maximum: number) {
  const count = Number(value);
  return Math.min(
    Number.isFinite(count) && Number.isInteger(count) && count > 0 ? count : 1,
    Math.max(1, maximum),
  );
}

// No depende de los controles del DOM: los deshabilitados y los ocultos por
// filtros también deben formar parte de la selección confirmada.
export function createWinnerSelectionSnapshot({
  tokens, reason, region, page, pageSize,
}: {
  tokens: Iterable<string>;
  reason: string;
  region: string;
  page: number;
  pageSize: string;
}) {
  const data = new FormData();
  for (const token of new Set(tokens)) data.append("winnerToken", token);
  data.set("reason", reason.trim());
  data.set("winnerRegionFilter", region);
  data.set("page", String(page));
  data.set("pageSize", pageSize);
  return data;
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
