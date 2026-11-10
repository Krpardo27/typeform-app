import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getWorkspaceRadioLogo } from "./radio-logos";
import { radioWorkspaceTemplates } from "./radio-workspaces";

describe("getWorkspaceRadioLogo", () => {
  it.each(radioWorkspaceTemplates)("resuelve el logo existente de $name por su ID", (radio) => {
    const logo = getWorkspaceRadioLogo({ name: "Nombre personalizado", typeformId: radio.typeformId, templateFormTypeformId: null });
    expect(logo?.name).toBe(radio.name);
    expect(logo?.src).toMatch(/^\/logo-radios\/.+\.png$/);
    expect(existsSync(path.join(process.cwd(), "public", logo!.src))).toBe(true);
  });

  it.each(radioWorkspaceTemplates)("resuelve un workspace clonado de $name por plantilla", (radio) => {
    const logo = getWorkspaceRadioLogo({ name: "Concurso de verano", typeformId: "nuevo-workspace", templateFormTypeformId: radio.templateFormTypeformId });
    expect(logo?.name).toBe(radio.name);
  });

  it.each([
    ["Radioactiva", "ACTIVA"], ["Los 40", "LOS40"], ["FM Dos", "FMDOS"],
    ["Radio Corazon", "CORAZÓN"], ["  adn  ", "ADN"],
  ])("reconoce el nombre exacto normalizado %s", (name, expected) => {
    expect(getWorkspaceRadioLogo({ name, typeformId: "otro", templateFormTypeformId: null })?.name).toBe(expected);
  });

  it("no asigna una radio por coincidencias parciales del nombre", () => {
    expect(getWorkspaceRadioLogo({ name: "Proyecto ADN verano", typeformId: "otro", templateFormTypeformId: null })).toBeNull();
  });

  it("prioriza la radio del workspace original frente a un nombre o plantilla diferente", () => {
    const [concierto, los40] = radioWorkspaceTemplates;
    expect(getWorkspaceRadioLogo({ name: los40.name, typeformId: concierto.typeformId, templateFormTypeformId: los40.templateFormTypeformId })?.name).toBe(concierto.name);
  });
});