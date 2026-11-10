import { afterEach, describe, expect, it, vi } from "vitest";
import type { WinnerCandidate } from "./types";
import { mapMaskedTypeformResponses } from "@/features/typeform/services/typeform.service";
import {
  areTokenSetsEqual,
  createWinnerSelectionSnapshot,
  deduplicateWinnerCandidates,
  filterWinnerCandidates,
  getParticipantReference,
  getWinnerCandidateProfiles,
  maskWinnerCandidateProfile,
  getRandomIndexes,
  getSafeRandomWinnerCount,
} from "./utils";

afterEach(() => vi.restoreAllMocks());

const candidates: WinnerCandidate[] = [
  { token: "t12", label: "Ana Pérez", email: "ana@example.test", city: "Iquique", participantNumber: 12, region: "Norte" },
  { token: "t112", label: "Luis", detail: "#112", region: "Sur" },
  { token: "t3", label: "Radio 12", participantNumber: 3, comuna: "Centro" },
  { token: "t4", label: "Andrea", detail: "#12", region: "Sur" },
];

describe("identidad y búsqueda de candidatos", () => {
  it("deduplica por token aunque cambien todos los metadatos; conserva el primero", () => {
    const first = { ...candidates[0], selected: true };
    const duplicate = { token: "t12", label: "Otro nombre", participantNumber: 99 };
    expect(deduplicateWinnerCandidates([first, duplicate, candidates[1]]))
      .toEqual([first, candidates[1]]);
  });

  it.each(["12", "#12", "  #12  "])("busca el número exacto con %s", (query) => {
    expect(filterWinnerCandidates(candidates, query, "").map((item) => item.token))
      .toEqual(["t12", "t4"]);
  });

  it("mantiene búsquedas textuales por nombre, incluso con números", () => {
    expect(filterWinnerCandidates(candidates, "radio 12", "")).toEqual([candidates[2]]);
    expect(filterWinnerCandidates(candidates, "PÉREZ", "")).toEqual([candidates[0]]);
    expect(filterWinnerCandidates(candidates, "centro", "")).toEqual([candidates[2]]);
    expect(filterWinnerCandidates(candidates, "ANA@EXAMPLE", "")).toEqual([candidates[0]]);
    expect(filterWinnerCandidates(candidates, "iquique", "Norte")).toEqual([candidates[0]]);
    expect(filterWinnerCandidates(candidates, "t112", "")).toEqual([]);
  });

  it("no redondea referencias largas ni busca números dentro de correos o ciudades", () => {
    const items = [
      { token: "a", label: "Ana 12", participantNumber: "9007199254740992", email: "12@example.test" },
      { token: "b", label: "Luis", participantNumber: "9007199254740993", city: "12" },
    ];
    expect(filterWinnerCandidates(items, "9007199254740993", "")).toEqual([items[1]]);
    expect(filterWinnerCandidates(items, "12", "")).toEqual([]);
    expect(getParticipantReference({ token: "secret", label: "Ana", detail: "secret" }, "secret")).toBe("Participante");
  });

  it("combina búsqueda y región sin modificar los candidatos", () => {
    expect(filterWinnerCandidates(candidates, "12", "Sur")).toEqual([candidates[3]]);
    expect(filterWinnerCandidates(candidates, "", "Norte")).toEqual([candidates[0]]);
    expect(candidates).toHaveLength(4);
  });
});

describe("proyección de perfil en servidor con el mapeador real", () => {
  it("identifica título y ref a la vez, conserva los valores reales y solo devuelve perfil", () => {
    const form = { id: "form", title: "Concurso", fields: [
      { id: "last", title: "Tus datos", ref: "last_name" },
      { id: "first", title: "Tus datos", ref: "first_name" },
      { id: "mail", title: "Contacto", ref: "correo_electronico" },
      { id: "region", title: "¿Dónde vives?", ref: "region" },
      { id: "city", title: "Residencia", ref: "city" },
    ] };
    const response = { token: "private-token", hidden: { secreto: "HIDDEN" }, answers: [
      { field: { id: "last" }, text: "Pérez" },
      { field: { id: "first" }, text: "Ana" },
      { field: { id: "mail" }, email: "ana@example.test", type: "email" },
      { field: { id: "region" }, choice: { label: "Región de Los Ríos" } },
      { field: { id: "city" }, text: "Valdivia" },
      { field: { ref: "comentario" }, text: "Comentario privado" },
    ] };
    expect(getWinnerCandidateProfiles(form, [response], mapMaskedTypeformResponses).get(response.token)).toEqual({
      label: "Ana Pérez", email: "ana@example.test", region: "Región de Los Ríos", city: "Valdivia",
    });
    expect(response.answers).toHaveLength(6);
    expect(form.fields).toHaveLength(5);
  });

  it("recorre grupos del formulario y respuestas anidadas con ref en la respuesta", () => {
    const form = { id: "form", title: "Concurso", fields: [{ type: "group", properties: { fields: [
      { id: "name", title: "Nombre completo" },
      { id: "place", title: "Tu ubicación", ref: "location" },
      { id: "city", title: "Ciudad" },
    ] } }] };
    const profile = getWinnerCandidateProfiles(form, [{ token: "a", answers: [{ answers: [
      { field: { id: "name" }, text: "María del Río" },
      { field: { id: "place", ref: "region" }, choices: { labels: ["O’Higgins"] } },
      { field: { id: "city" }, text: "Rancagua" },
    ] }] }], mapMaskedTypeformResponses).get("a");
    expect(profile).toEqual({ label: "María del Río", email: undefined, region: "O’Higgins", city: "Rancagua" });
  });

  it("lee contact_info y address sin proyectar calle, teléfono, país o código postal", () => {
    const profile = getWinnerCandidateProfiles({ id: "form", title: "Concurso" }, [{ token: "a", answers: [
      { type: "contact_info", contact_info: { first_name: "Ana", last_name: "Pérez", email: "ana@example.test", phone_number: "PHONE" } },
      { type: "address", address: { address_line_1: "CALLE", city: "Puerto Varas", state: "Los Lagos", country: "Chile", zip_code: "ZIP" } },
    ] }], mapMaskedTypeformResponses).get("a");
    expect(profile).toEqual({ label: "Ana Pérez", email: "ana@example.test", region: "Los Lagos", city: "Puerto Varas" });
  });

  it("no inventa datos ausentes ni transforma una ciudad en región por coincidencia parcial", () => {
    const profiles = getWinnerCandidateProfiles({ id: "form", title: "Concurso" }, [
      { token: "empty" },
      { token: "real", answers: [
        { field: { ref: "region" }, text: "Los Ríos y cuenca local" },
        { field: { ref: "city" }, text: "Santiago" },
      ] },
    ], mapMaskedTypeformResponses);
    expect(profiles.get("empty")).toEqual({ label: undefined, email: undefined, region: undefined, city: undefined });
    expect(profiles.get("real")?.region).toBe("Los Ríos y cuenca local");
  });
});

describe("proyección enmascarada antes de serializar candidatos", () => {
  it("enmascara identidad, conserva comuna trimmed y devuelve solo un DTO seguro sin mutar el perfil raw", () => {
    const raw = { label: "María Pérez", email: "  maria@dominio-privado.test  ", city: "  Valdivia  ", region: " los ríos ",
      answers: "RESPUESTAS-PRIVADAS", hidden: "HIDDEN-PRIVADO", phone: "TELEFONO-PRIVADO" };
    const masked = maskWinnerCandidateProfile(raw);
    expect(masked).toEqual({ label: "Ma****", email: "mar*****", city: "Valdivia", region: "Región de Los Ríos" });
    const serialized = JSON.stringify(masked);
    for (const secret of ["María", "Pérez", "maria", "dominio-privado.test", "PRIVAD", "answers", "hidden", "phone"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(raw.label).toBe("María Pérez");
    expect(raw.email).toContain("dominio-privado.test");
    expect(raw.city).toBe("  Valdivia  ");
  });

  it.each([
    ["A", "****"], ["Al", "A****"], ["Ana", "An****"], ["Alex", "Al****"],
    ["李", "****"], ["李明", "李****"], ["𐐀𐐁𐐂", "𐐀𐐁****"],
  ])("oculta nombres cortos pero conserva la comuna sin espacios exteriores: %s", (value, masked) => {
    expect(maskWinnerCandidateProfile({ label: value, city: ` ${value} ` })).toMatchObject({ label: masked, city: value });
    expect(masked).not.toBe(`${value}****`);
  });

  it.each([
    ["a@privado.test", "*****"], ["ab@privado.test", "a*****"],
    ["abc@privado.test", "ab*****"], ["abcd@privado.test", "abc*****"],
  ])("oculta el dominio y al menos un carácter local en %s", (email, masked) => {
    expect(maskWinnerCandidateProfile({ email }).email).toBe(masked);
  });

  it("omite datos ausentes o vacíos sin inventar información personal", () => {
    expect(maskWinnerCandidateProfile({})).toEqual({ label: undefined, email: undefined, region: undefined, city: undefined });
    expect(maskWinnerCandidateProfile({ label: " ", email: " ", region: " ", city: " " })).toEqual(maskWinnerCandidateProfile({}));
  });

  it.each([
    ["REGION METROPOLITANA", "Región Metropolitana de Santiago"],
    [" metropolitana de santiago ", "Región Metropolitana de Santiago"],
    ["O’Higgins", "Región del Libertador General Bernardo O'Higgins"],
    ["region de los rios", "Región de Los Ríos"],
    ["Los Lagos", "Región de Los Lagos"],
    ["Bío Bío", "Región del Biobío"],
    ["nuble", "Región de Ñuble"],
    ["Aysén", "Región de Aysén del General Carlos Ibáñez del Campo"],
    ["Magallanes", "Región de Magallanes y de la Antártica Chilena"],
  ])("normaliza exactamente el alias regional seguro %s", (region, expected) => {
    const projected = maskWinnerCandidateProfile({ region });
    expect(projected.region).toBe(expected);
    expect(filterWinnerCandidates([{ token: "a", label: "****", ...projected }], "", expected)).toHaveLength(1);
  });

  it.each([
    "Región Metropolitana / SECRETO-REGION", "Los Ríos y cuenca local", "Los Lagos, Calle Privada 123",
    "Ana Pérez", "ana@example.test", "Valdivia", "Norte", "Sur", "Región de Los Ríos\nCASA-PRIVADA",
    "Región de Los Ríos, Región de Los Lagos",
  ])("omite regiones desconocidas o contaminadas con texto libre: %s", (region) => {
    const profile = maskWinnerCandidateProfile({ region });
    expect(profile.region).toBeUndefined();
    expect(JSON.stringify(profile)).toBe("{}");
  });

  it("enmascara el resultado del extractor real para compound/address sin proyectar sus campos crudos", () => {
    const responses = [{ token: "compound", answers: [
      { type: "contact_info", contact_info: { first_name: "Beatriz", last_name: "Privada", email: "beatriz@privado.test", phone_number: "TELEFONO-PRIVADO" } },
      { type: "address", address: { address_line_1: "CALLE-PRIVADA", city: "Puerto Varas", state: "Los Lagos", country: "PAIS-PRIVADO", zip_code: "CODIGO-PRIVADO" } },
    ], hidden: { secreto: "HIDDEN-PRIVADO" } }];
    const raw = getWinnerCandidateProfiles({ id: "form", title: "Concurso" }, responses, mapMaskedTypeformResponses).get("compound")!;
    expect(raw.label).toBe("Beatriz Privada");
    const masked = maskWinnerCandidateProfile(raw);
    expect(masked).toEqual({ label: "Be****", email: "bea*****", city: "Puerto Varas", region: "Región de Los Lagos" });
    expect(JSON.stringify(masked)).not.toMatch(/Beatriz|Privada|beatriz|@privado|PRIVAD|contact_info|address/);
  });
});

describe("cantidad de ganadores", () => {
  it.each(["", "NaN", "Infinity", "2.5", "-2", "0", "12abc"])(
    "normaliza %s sin NaN, fracciones o cantidades negativas", (value) => {
      expect(getSafeRandomWinnerCount(value, 8)).toBe(1);
    },
  );

  it("limita cantidades válidas al máximo disponible", () => {
    expect(getSafeRandomWinnerCount("3", 8)).toBe(3);
    expect(getSafeRandomWinnerCount("50", 8)).toBe(8);
    expect(getSafeRandomWinnerCount("1", 0)).toBe(1);
  });
});

describe("instantánea de confirmación", () => {
  it("incluye tokens fuera del filtro y conserva motivo, región y paginación antes del await", async () => {
    const tokens = new Set(["visible", "oculto"]);
    const snapshot = createWinnerSelectionSnapshot({
      tokens, reason: "  Motivo manual  ", region: "Norte", page: 3, pageSize: "all",
    });
    tokens.clear();
    await Promise.resolve();
    expect([...snapshot.entries()]).toEqual([
      ["winnerToken", "visible"], ["winnerToken", "oculto"],
      ["reason", "Motivo manual"], ["winnerRegionFilter", "Norte"],
      ["page", "3"], ["pageSize", "all"],
    ]);
  });

  it("elimina tokens repetidos y permite guardar la eliminación de todos los ganadores", () => {
    const makeSnapshot = (tokens: string[]) => createWinnerSelectionSnapshot({
      tokens, reason: "Quitar selección", region: "", page: 1, pageSize: "20",
    });
    expect(makeSnapshot(["a", "a"]).getAll("winnerToken")).toEqual(["a"]);
    expect(makeSnapshot([]).getAll("winnerToken")).toEqual([]);
    expect(makeSnapshot([]).get("reason")).toBe("Quitar selección");
  });

  it("compara cambios de selección independientemente del orden", () => {
    expect(areTokenSetsEqual(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(true);
    expect(areTokenSetsEqual(new Set(["a"]), new Set(["b"]))).toBe(false);
    expect(areTokenSetsEqual(new Set(), new Set(["a"]))).toBe(false);
  });
});

describe("sorteo criptográfico síncrono", () => {
  it("devuelve una permutación sin duplicados sin temporizadores ni Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const timer = vi.spyOn(globalThis, "setTimeout");
    const result = getRandomIndexes(25);
    expect(result).toHaveLength(25);
    expect([...result].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(random).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
    expect(getRandomIndexes(0)).toEqual([]);
    expect(getRandomIndexes(1)).toEqual([0]);
  });

  it("rechaza valores fuera del intervalo uniforme antes de aplicar el módulo", () => {
    const values = [0xffffffff, 1, 0];
    const cryptoSpy = vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint32Array)[0] = values.shift()!;
      return array;
    });
    expect(getRandomIndexes(3)).toEqual([2, 0, 1]);
    expect(cryptoSpy).toHaveBeenCalledTimes(3);
  });
});