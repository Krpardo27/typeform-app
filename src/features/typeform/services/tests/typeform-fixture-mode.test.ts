import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usesTypeformResponseFixtures } from "../typeform-fixture-mode";

// No cargar dotenv/Next env: Vitest debe conservar su entorno test, no el
// .env.development.local de quien ejecuta la suite.
const runnerNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", "fixture");
  vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("política de fixtures locales", () => {
  it("Vitest arranca en test, sin convertir globalmente la suite a development", () => {
    expect(runnerNodeEnv).toBe("test");
  });

  it.each([undefined, "", "remote", "FIXTURE", " fixture "])("no habilita con SOURCE=%s", (source) => {
    vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", source);
    expect(usesTypeformResponseFixtures("form-a")).toBe(false);
  });

  it.each(["test", "development"])("permite fixtures explícitos fuera de producción (%s)", (env) => {
    vi.stubEnv("NODE_ENV", env);
    expect(usesTypeformResponseFixtures("form_A-123")).toBe(true);
  });

  it.each([undefined, "", " , , ", "form-a", "form-a,form-b"])("producción siempre deshabilita, incluso con lista %s", (ids) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", ids);
    expect(usesTypeformResponseFixtures("form-a")).toBe(false);
    expect(usesTypeformResponseFixtures("form-b")).toBe(false);
  });

  it("la lista separada por comas recorta blancos y solo afecta IDs exactos", () => {
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", " , form-a, form_B , form-a, ,");
    for (const id of ["form-a", "form_B"]) expect(usesTypeformResponseFixtures(id)).toBe(true);
    for (const id of ["form", "form-ab", "FORM-A", "other"]) expect(usesTypeformResponseFixtures(id)).toBe(false);
  });

  it.each([undefined, "", " , , "])("sin IDs efectivos habilita todos los IDs seguros (%s)", (ids) => {
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", ids);
    expect(usesTypeformResponseFixtures("form-a")).toBe(true);
    expect(usesTypeformResponseFixtures("other")).toBe(true);
  });

  it.each(["", "../secret", "/tmp/form", "a/b", "a\\b", ".", "..", "%2e%2e", "form.json", " form", "form ", "form\n", "a\0b", "á"])("rechaza el ID inseguro %j", (id) => {
    expect(usesTypeformResponseFixtures(id)).toBe(false);
    vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", id);
    expect(usesTypeformResponseFixtures(id)).toBe(false);
  });
});