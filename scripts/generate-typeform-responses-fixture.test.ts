import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildFixture, generateFixtures, parseFixtureArgs, validateFormId,
  type TypeformFixtureField,
} from "./generate-typeform-responses-fixture";
import { mapMaskedTypeformResponses, type TypeformResponseItem } from "../src/features/typeform/services/typeform.service";
import { getWinnerCandidateProfiles } from "../src/features/typeform/components/responses/winner-selection/utils";

const FORM_ID = "mqUO6e4B";
const realTextFields: TypeformFixtureField[] = [
  { id: "n-a1", ref: "ref-n", title: "Nombres", type: "short_text" },
  { id: "p-b2", ref: "ref-p", title: "Primer apellido", type: "short_text" },
  { id: "m-c3", ref: "ref-m", title: "Segundo apellido", type: "short_text" },
  { id: "rut-d4", ref: "ref-rut", title: "RUT:", type: "short_text" },
  { id: "e-e5", ref: "ref-e", title: "Correo electrónico", type: "email" },
  { id: "t-f6", ref: "ref-t", title: "Teléfono", type: "phone_number" },
  { id: "r-g7", ref: "ref-r", title: "Región", type: "short_text" },
  { id: "c-h8", ref: "ref-c", title: "Comuna", type: "short_text" },
  { id: "i-i9", title: "Tu Instagram", type: "short_text" },
];

type Answer = NonNullable<TypeformResponseItem["answers"]>[number];
function flattened(answers: Answer[]): Answer[] {
  return answers.flatMap((answer) => Array.isArray(answer.answers)
    ? flattened(answer.answers as Answer[]) : [answer]);
}
function values(item: TypeformResponseItem) {
  return Object.fromEntries(flattened(item.answers ?? []).map((answer) => [
    answer.field?.id ?? answer.field?.ref,
    answer.text ?? answer.email ?? answer.phone_number ?? answer.choice?.label,
  ]));
}

const temporaryDirs: string[] = [];
async function destination() {
  const dir = await mkdtemp(path.join(tmpdir(), "typeform-fixture-test-"));
  temporaryDirs.push(dir);
  return dir;
}
function mockNetwork() {
  vi.stubEnv("TYPEFORM_TOKEN", "synthetic-test-credential");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ fields: realTextFields, hidden: ["email"] })));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  return fetchMock;
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("argumentos estrictos", () => {
  it("mantiene workspace y count predeterminados y acepta ambas sintaxis", () => {
    expect(parseFixtureArgs([])).toEqual({ workspaceId: "gE4Nx2", count: 120, force: false });
    expect(parseFixtureArgs(["--formId", FORM_ID, "--count", "250"])).toMatchObject({ formId: FORM_ID, count: 250, force: false });
    expect(parseFixtureArgs(["--formId=a_B-9", "--count=5000", "--workspaceId=other", "--force"]))
      .toEqual({ formId: "a_B-9", count: 5000, workspaceId: "other", force: true });
    expect(parseFixtureArgs(["--count=1"]).count).toBe(1);
  });

  it.each(["0", "-1", "5001", "1.5", "250abc", "NaN", "Infinity", "1e3", "0x10", "", " 2 ", "99999999999999999999"])("rechaza count %j sin truncarlo", (count) => {
    expect(() => parseFixtureArgs([`--count=${count}`])).toThrow();
  });

  it.each(["../escape", "a/b", "a\\b", ".", "..", "%2e%2e", "a.json", "", "a?x", "a\n"])("rechaza ID inseguro %j", (id) => {
    expect(() => validateFormId(id)).toThrow();
    expect(() => parseFixtureArgs([`--formId=${id}`])).toThrow();
  });

  it.each([["--count"], ["--formId", "--force"], ["--count=2", "--count=3"], ["--force=false"], ["--force", "--force"], ["--unknown=1"]])("rechaza argumentos ambiguos %j", (...args) => {
    expect(() => parseFixtureArgs(args)).toThrow();
  });

  it.each([NaN, Infinity, 0, -1, 1.5, 5001])("valida también llamadas puras: %s", (count) => {
    expect(() => buildFixture(FORM_ID, [], [], count)).toThrow();
  });
});

describe("participantes sintéticos por esquema", () => {
  it("varía nombres y ambos apellidos, conserva IDs/refs/tipos y es determinista", () => {
    const before = JSON.stringify(realTextFields);
    const fixture = buildFixture(FORM_ID, realTextFields, ["email", "campaign"], 250);
    expect(fixture).toEqual(buildFixture(FORM_ID, realTextFields, ["email", "campaign"], 250));
    expect(JSON.stringify(realTextFields)).toBe(before);
    expect(fixture.items).toHaveLength(250);
    for (const id of ["n-a1", "p-b2", "m-c3"]) {
      expect(new Set(fixture.items.map((item) => values(item)[id])).size).toBeGreaterThan(10);
    }
    for (const item of fixture.items) {
      const v = values(item);
      expect(v["p-b2"]).not.toBe(v["m-c3"]);
      expect(v["rut-d4"]).toMatch(/^00\.\d{3}\.\d{3}-[01]$/);
      expect(v["i-i9"]).toMatch(/^@fixture_inexistente_\d+$/);
      expect(v["t-f6"]).toMatch(/^\+56000\d{6}$/);
      expect(item.answers?.map((answer) => answer.field)).toEqual(realTextFields.map(({ id, ref, type }) => ({ id, ref, type })));
      expect(item.hidden?.email).toMatch(/@example\.invalid$/);
      expect(Object.keys(item.hidden ?? {})).toEqual(["email", "campaign"]);
    }
  });

  it("genera 5000 emails, teléfonos, RUTs, Instagram, tokens y fechas únicos sin contactos reales", () => {
    const fixture = buildFixture(FORM_ID, realTextFields, [], 5000);
    for (const id of ["e-e5", "t-f6", "rut-d4", "i-i9"]) {
      expect(new Set(fixture.items.map((item) => values(item)[id])).size).toBe(5000);
    }
    for (const key of ["token", "response_id", "landing_id", "submitted_at", "landed_at"] as const) {
      expect(new Set(fixture.items.map((item) => item[key])).size).toBe(5000);
    }
    for (const item of fixture.items) {
      expect(values(item)["e-e5"]).toMatch(/^participante\.\d+@example\.invalid$/);
      expect(new Date(item.submitted_at!).toISOString()).toBe(item.submitted_at);
      expect(Date.parse(item.landed_at!)).toBeLessThan(Date.parse(item.submitted_at!));
      const [body, digit] = String(values(item)["rut-d4"]).replace(/\./g, "").split("-");
      const sum = [...body].reverse().reduce((total, n, i) => total + Number(n) * (2 + i % 6), 0);
      const remainder = 11 - sum % 11;
      expect(digit).not.toBe(remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder));
    }
  });

  it("región y comuna short_text son coherentes y legibles por el perfil real", () => {
    const fixture = buildFixture(FORM_ID, realTextFields, [], 80);
    const profiles = getWinnerCandidateProfiles({ id: FORM_ID, title: "Prueba", fields: realTextFields }, fixture.items, mapMaskedTypeformResponses);
    expect(new Set([...profiles.values()].map((profile) => profile.region)).size).toBe(16);
    expect(profiles.get(fixture.items[0].token)).toMatchObject({
      label: "Amalia Alarcón", email: "participante.1@example.invalid",
      region: "Región de Arica y Parinacota", city: "Arica",
    });
    const allowed: Record<string, string[]> = {
      "Región de Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
      "Región Metropolitana de Santiago": ["Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes"],
      "Región de Los Lagos": ["Puerto Montt", "Osorno", "Castro", "Ancud", "Puerto Varas"],
    };
    for (const profile of profiles.values()) {
      expect(profile.city).toBeTruthy();
      if (profile.region && allowed[profile.region]) expect(allowed[profile.region]).toContain(profile.city);
    }
  });

  it.each(["short_text", "dropdown"])("usa solo opciones reales con región %s y comuna dropdown", (regionType) => {
    const fields: TypeformFixtureField[] = [
      { id: "r", title: "Región", type: regionType, properties: { choices: [{ label: "Metropolitana" }, { label: "Los Lagos" }] } },
      { id: "c", title: "Comuna", type: "dropdown", choices: [{ label: "Maipú" }, { label: "Puerto Varas" }] },
    ];
    const items = buildFixture(FORM_ID, fields, [], 30).items;
    for (const item of items) {
      const v = values(item);
      const metropolitan = String(v.r).includes("Metropolitana");
      expect(v.c).toBe(metropolitan ? "Maipú" : "Puerto Varas");
      if (regionType === "dropdown") expect(["Metropolitana", "Los Lagos"]).toContain(v.r);
      expect(item.answers?.[0].field?.type).toBe(regionType);
    }
    expect(new Set(items.map((item) => values(item).c)).size).toBe(2);
  });

  it("no inventa opciones cuando región y comuna del esquema son incompatibles", () => {
    expect(() => buildFixture(FORM_ID, [
      { id: "r", title: "Región", type: "dropdown", choices: [{ label: "Los Lagos" }] },
      { id: "c", title: "Comuna", type: "dropdown", choices: [{ label: "Santiago" }] },
    ], [], 1)).toThrow(/coherentes/);
  });

  it("resuelve contact_info, address y grupos recursivos conservando identidades de hijos", () => {
    const fields: TypeformFixtureField[] = [{ id: "group", ref: "g-ref", type: "group", properties: { fields: [
      { id: "contact", ref: "contact-ref", type: "contact_info", properties: { fields: realTextFields.slice(0, 6) } },
      { id: "address", type: "address", fields: realTextFields.slice(6, 8) },
      { id: "statement", type: "statement", title: "No responder" },
    ] } }];
    const { items } = buildFixture(FORM_ID, fields, [], 3);
    expect(items[0].answers?.[0].field).toEqual({ id: "group", ref: "g-ref", type: "group" });
    expect(flattened(items[0].answers ?? []).map((answer) => answer.field)).toEqual(realTextFields.slice(0, 8).map(({ id, ref, type }) => ({ id, ref, type })));
    const form = { id: FORM_ID, title: "Prueba anidada", fields };
    const profiles = getWinnerCandidateProfiles(form, items, mapMaskedTypeformResponses);
    expect(profiles.get(items[0].token)).toMatchObject({ label: "Amalia Alarcón", email: "participante.1@example.invalid", city: "Arica" });
    const mapped = mapMaskedTypeformResponses(form, items, { unmaskTokens: new Set(items.map((item) => item.token)) });
    expect(mapped[0].answers.map((answer) => answer.fieldLabel)).toEqual(realTextFields.slice(0, 8).map((field) => field.title));
  });

  it("usa refs semánticas sin inventar IDs; respeta el tipo real aun si el título dice correo", () => {
    const fields = [
      { ref: "first_name", type: "short_text" }, { ref: "last_name", type: "short_text" },
      { id: "text-email", title: "Correo", type: "short_text" },
      { id: "s", type: "statement" }, { id: "upload", type: "file_upload" },
    ];
    const item = buildFixture(FORM_ID, fields, [], 1).items[0];
    expect(item.answers).toHaveLength(3);
    expect(item.answers?.[0]).toEqual({ field: { ref: "first_name", type: "short_text" }, type: "text", text: "Amalia" });
    expect(item.answers?.[1]?.text).toBe("Alarcón Barrera");
    expect(item.answers?.[2]).toMatchObject({ field: { type: "short_text" }, type: "text", text: "participante.1@example.invalid" });
    expect(() => buildFixture(FORM_ID, [{ title: "Sin identidad", type: "short_text" }], [], 1)).toThrow(/identidad/);
  });
});

describe("IO restringido y CLI importable", () => {
  it("importar con tsx no ejecuta CLI, carga dotenv ni inicia red (también con argv de CLI)", () => {
    const script = path.resolve("scripts/generate-typeform-responses-fixture.ts");
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      process.argv = [process.execPath, "not-the-generator.ts", "--formId", "${FORM_ID}", "--count", "250"];
      globalThis.fetch = () => { throw new Error("NETWORK_ON_IMPORT"); };
      const before = JSON.stringify(process.env);
      await import(${JSON.stringify(script)});
      if (JSON.stringify(process.env) !== before) throw new Error("ENV_CHANGED_ON_IMPORT");
      console.log("IMPORT_ONLY");
    `], { encoding: "utf8", timeout: 15000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("IMPORT_ONLY");
    expect(result.stderr).toBe("");
  });

  it("el comando npm sigue activo y rechaza count inválido antes de red o credenciales", () => {
    // Invalid input only: never run the real generator against a real form.
    const result = spawnSync("npm", ["run", "typeform:fixtures", "--", "--formId", FORM_ID, "--count", "1.5"], {
      encoding: "utf8", timeout: 15000,
      env: { ...process.env, TYPEFORM_TOKEN: "", TYPEFORM_API_TOKEN: "" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("count 1..5000");
  });

  it("solo hace GET del esquema solicitado y escribe sintéticos en un directorio temporal", async () => {
    const fetchMock = mockNetwork();
    const dir = await destination();
    await generateFixtures(parseFixtureArgs(["--formId", FORM_ID, "--count=3"]), dir);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`https://api.typeform.com/forms/${FORM_ID}`, {
      method: "GET", headers: { Authorization: "Bearer synthetic-test-credential" }, redirect: "error",
    });
    const fixture = JSON.parse(await readFile(path.join(dir, `${FORM_ID}.json`), "utf8"));
    expect(fixture).toEqual(buildFixture(FORM_ID, realTextFields, ["email"], 3));
  });

  it("falla sin red ni sobrescritura cuando el fixture existe; --force permite reemplazarlo", async () => {
    const fetchMock = mockNetwork();
    const dir = await destination();
    const target = path.join(dir, `${FORM_ID}.json`);
    await writeFile(target, "existing");
    const options = parseFixtureArgs([`--formId=${FORM_ID}`, "--count=2"]);
    await expect(generateFixtures(options, dir)).rejects.toThrow(/--force/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await readFile(target, "utf8")).toBe("existing");
    await generateFixtures({ ...options, force: true }, dir);
    expect(JSON.parse(await readFile(target, "utf8")).items).toHaveLength(2);
  });

  it("la escritura exclusiva impide sobrescribir incluso si aparece tras comprobar el destino", async () => {
    const fetchMock = mockNetwork();
    const dir = await destination();
    const target = path.join(dir, `${FORM_ID}.json`);
    fetchMock.mockImplementationOnce(async () => {
      await writeFile(target, "race-winner");
      return new Response(JSON.stringify({ fields: realTextFields }));
    });
    await expect(generateFixtures(parseFixtureArgs([`--formId=${FORM_ID}`]), dir)).rejects.toThrow(/escribir/);
    expect(await readFile(target, "utf8")).toBe("race-winner");
  });

  it("conserva el workspace predeterminado, pagina formularios y solo consulta esquemas", async () => {
    const fetchMock = mockNetwork();
    fetchMock.mockImplementation(async (url: string) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/forms") {
        expect(parsed.searchParams.get("workspace_id")).toBe("gE4Nx2");
        return new Response(JSON.stringify({ page_count: 2, items: [{ id: parsed.searchParams.get("page") === "1" ? "form_A" : "form_B" }] }));
      }
      return new Response(JSON.stringify({ fields: realTextFields }));
    });
    const dir = await destination();
    await generateFixtures(parseFixtureArgs(["--count=1"]), dir);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(init.method).toBe("GET");
      expect(String(url)).not.toContain("/responses");
    }
    for (const id of ["form_A", "form_B"]) expect(JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8")).items).toHaveLength(1);
  });

  it("rechaza IDs remotos inseguros y valida opciones antes de hacer GET", async () => {
    const fetchMock = mockNetwork();
    const dir = await destination();
    await expect(generateFixtures({ workspaceId: "gE4Nx2", formId: "../escape", count: 2, force: false }, dir)).rejects.toThrow(/formId/);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ page_count: 1, items: [{ id: "../escape" }] })));
    await expect(generateFixtures(parseFixtureArgs([]), dir)).rejects.toThrow(/formId/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["network", "http", "json"])("no propaga token ni cuerpo sensible en error %s", async (mode) => {
    const fetchMock = mockNetwork();
    if (mode === "network") fetchMock.mockRejectedValueOnce(new Error("Bearer synthetic-test-credential"));
    if (mode === "http") fetchMock.mockResolvedValueOnce(new Response("synthetic-test-credential", { status: 401 }));
    if (mode === "json") fetchMock.mockResolvedValueOnce(new Response("synthetic-test-credential"));
    const dir = await destination();
    await expect(generateFixtures(parseFixtureArgs([`--formId=${FORM_ID}`]), dir)).rejects.toThrow(/^No se pudo consultar el esquema o catálogo de Typeform\.$/);
  });
});