import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";
import { WorkspaceFormResponsesList } from "./WorkspaceFormResponsesList";
import { ResponseTableRow } from "./ResponseTableRow";
import { ParticipantContact } from "./ParticipantContact";

function response(token: string, visibility: "anonymous" | "winner" = "anonymous"): MaskedTypeformResponse {
  return {
    token, visibility, submittedAt: "2026-11-02T12:34:56.000Z",
    answers: [{ id: "a", question: "Comentario", value: `DATO-${token}`, masked: false }],
    hidden: [{ id: "email", question: "email", value: `${token}@example.test`, masked: false }],
  };
}

describe("sección exclusiva de datos de ganadores", () => {
  it.each([{ responses: [] }, { responses: [response("anonimo")] }])("antes de confirmar solo muestra un aviso, sin tabla duplicada ni controles: %j", ({ responses }) => {
    const html = renderToStaticMarkup(<WorkspaceFormResponsesList responses={responses} canExportResponses />);
    expect(html).toContain("Datos de los ganadores");
    expect(html).toContain("Confirma una selección de ganadores");
    expect(html).not.toMatch(/<(?:table|input|button|select|nav)\b/);
    expect(html).not.toContain("DATO-anonimo");
    expect(html).not.toContain("anonimo@example.test");
    expect(html).not.toContain("UTC");
  });

  it("solo pinta ganadores confirmados, aunque reciba datos de otro participante por error", () => {
    const html = renderToStaticMarkup(<WorkspaceFormResponsesList
      responses={[response("ganador", "winner"), response("no-seleccionado")]}
      contactsByToken={{ ganador: "guardado@example.test", "no-seleccionado": "SECRETO-OVERRIDE" }}
      canExportResponses={false}
    />);
    expect(html).toContain("Ganador #1");
    expect(html).not.toContain("Ganador #2");
    expect(html).toContain("DATO-ganador");
    expect(html).toContain("guardado@example.test");
    expect(html).not.toContain("DATO-no-seleccionado");
    expect(html).not.toContain("no-seleccionado@example.test");
    expect(html).not.toContain("SECRETO-OVERRIDE");
    expect(html.match(/<table\b/g)).toHaveLength(1);
    expect(html).not.toContain('aria-label="Paginación"');
  });

  it("no duplica el mismo token ganador ni vuelve a recortar los datos a diez filas", () => {
    const winners = Array.from({ length: 12 }, (_, index) => response(`winner-${index}`, "winner"));
    const html = renderToStaticMarkup(<WorkspaceFormResponsesList responses={[...winners, winners[0]]} canExportResponses={false} />);
    expect(html).toContain("12 ganadores confirmados");
    expect(html).toContain("Ganador #12");
    expect(html).not.toContain("Ganador #13");
    expect(html).toContain("DATO-winner-11");
    expect(html).not.toContain("<select");
    expect(html).not.toContain('aria-label="Paginación"');
  });

  it("sin flag de visibilidad no interpreta respuestas ni masked=false como autorización", () => {
    const legacy = response("sin-flag", "winner");
    delete legacy.visibility;
    const html = renderToStaticMarkup(<WorkspaceFormResponsesList responses={[legacy]} canExportResponses={false} />);
    expect(html).not.toContain("<table");
    expect(html).not.toContain("DATO-sin-flag");
  });

  it("ofrece únicamente exportar ganadores y búsqueda sobre los datos confirmados", () => {
    const html = renderToStaticMarkup(<WorkspaceFormResponsesList responses={[response("winner", "winner")]}
      exportBaseHref="/workspaces/radio/forms/form/responses/export" canExportResponses />);
    expect(html).toContain("Exportar ganadores");
    expect(html).toContain("Buscar ganadores confirmados");
    expect(html).not.toContain('>Participantes<');
    expect(html).toContain("Expandir visibles");
    expect(html).toContain("Contraer visibles");
    expect(html).toContain("relative overflow-x-auto");
    expect(html).toContain("Ganadores confirmados, contactos y respuestas del formulario");
  });
});

describe("ResponseTableRow y ParticipantContact", () => {
  it("el flag de ganador permite expansión accesible y fecha UTC sin convertir tr en botón", () => {
    const html = renderToStaticMarkup(<table><tbody><ResponseTableRow
      response={response("winner", "winner")} isExpanded participantLabel="Ganador #1" onToggle={() => {}} colSpan={5}
    /></tbody></table>);
    expect(html).not.toContain('role="button"');
    expect(html).toContain('aria-label="Contraer respuesta de Ganador #1"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('colSpan="5"');
    expect(html).toContain("UTC");
    const control = html.match(/aria-controls="([^"]+)"/)![1];
    expect(html).toContain(`id="${control}"`);
  });

  it.each(["default", "winner"] as const)("variant=%s y isExpanded no revelan datos de un no ganador", (variant) => {
    const html = renderToStaticMarkup(<table><tbody><ResponseTableRow
      response={response("anonimo")} isExpanded participantLabel="Participante #1" variant={variant}
      contactOverride="OVERRIDE-PRIVADO" onToggle={() => {}}
    /></tbody></table>);
    expect(html).toContain("Datos ocultos");
    expect(html).not.toContain("DATO-anonimo");
    expect(html).not.toContain("anonimo@example.test");
    expect(html).not.toContain("OVERRIDE-PRIVADO");
    expect(html).not.toContain("UTC");
    expect(html).not.toContain("<button");
    expect(html.match(/<tr\b/g)).toHaveLength(1);
  });

  it("el contacto también rechaza overrides para una respuesta anónima", () => {
    const html = renderToStaticMarkup(<ParticipantContact response={response("anonimo")} contactOverride="SECRETO" />);
    expect(html).toBe("Datos ocultos");
  });

  it("un ganador con fecha inválida no rompe la tabla", () => {
    const html = renderToStaticMarkup(<table><tbody><ResponseTableRow
      response={{ ...response("winner", "winner"), submittedAt: "invalid" }}
      isExpanded={false} participantLabel="Ganador #1" onToggle={() => {}}
    /></tbody></table>);
    expect(html).toContain("Fecha inválida");
  });
});