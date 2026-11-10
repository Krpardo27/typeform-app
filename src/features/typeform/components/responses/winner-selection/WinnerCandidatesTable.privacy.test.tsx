import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import type { WinnerCandidate } from "./types";

// Las props conservan perfiles enmascarados para modal/exportación, pero la
// tabla no renderiza nombre/email ni en texto ni en atributos, incluso con grant.
const candidates: WinnerCandidate[] = [
  { token: "a", label: "An****", email: "ana*****", city: "Valdivia", region: "Región de Los Ríos", participantNumber: 12, selected: true },
  { token: "b", label: "Lu****", email: "lui*****", comuna: "Puerto Varas", region: "Región de Los Lagos", participantNumber: 112 },
];

describe("identidad de candidatos ausente del HTML de la tabla", () => {
  it("normaliza solo la ubicación visible sin modificar DTO, máscaras ni contacto para otros consumidores", () => {
    const input: WinnerCandidate[] = [
      { token: "a", label: "An****", email: "ana*****", city: "", comuna: "  Ñuñoa  ", participantNumber: 1 },
      { token: "b", label: "Lu****", email: "lui*****", city: "   ", comuna: "  Valdivia  ", participantNumber: 2 },
      { token: "c", label: "Ma****", email: "mar*****", city: "  Osorno  ", comuna: "IGNORADA", participantNumber: 3 },
      { token: "d", label: "Pe****", email: "ped*****", city: "  ", comuna: "\t ", participantNumber: 4 },
    ];
    const original = structuredClone(input);
    input.forEach(Object.freeze);
    Object.freeze(input);
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={input} isPending={false} query="" selectedTokens={new Set(["a"])}
      viewableTokens={new Set(["a"])} onViewCandidate={() => {}}
      onCandidateChange={() => {}} onQueryChange={() => {}}
    />);
    const rows = html.match(/<tbody>(.*?)<\/tbody>/)![1].match(/<tr\b[^>]*>.*?<\/tr>/g)!;
    expect(rows.map((row) => [...row.matchAll(/<td\b[^>]*>(.*?)<\/td>/g)][3][1])).toEqual(["Ñuñoa", "Valdivia", "Osorno", "-"]);
    for (const { label, email } of input) {
      expect(html).not.toContain(label);
      expect(html).not.toContain(email!);
    }
    expect(html).not.toContain("IGNORADA");
    expect(input).toEqual(original);
  });

  it.each([true, false])("ausente seleccionado=%s: permite retirar, nunca añadir ni leer aunque haya grant", (selected) => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={[{ token: "TOKEN-INTERNO", label: "Participante no disponible", participantNumber: 3, selected: true, missingResponse: true }]}
      isPending={false} query="" selectedTokens={new Set(selected ? ["TOKEN-INTERNO"] : [])}
      viewableTokens={new Set(["TOKEN-INTERNO"])} onViewCandidate={() => {}}
      onCandidateChange={() => {}} onQueryChange={() => {}}
    />);
    expect(html).toContain("Respuesta no disponible");
    expect(html).toContain('aria-label="Retirar participante #3"');
    expect(html).toContain('aria-label="Ver datos del participante #3"');
    expect(html).not.toContain("Participante no disponible");
    expect(html.replace(/<[^>]*>/g, "")).not.toContain("TOKEN-INTERNO");
    expect(html.match(/aria-label="[^"]*"/g)?.join(" ")).not.toContain("TOKEN-INTERNO");
    const cells = html.match(/<td\b[^>]*>.*?<\/td>/g)!;
    expect(cells).toHaveLength(5);
    expect(cells[1]).toContain("#3");
    expect(cells[1]).toContain("Ganador guardado");
    expect(cells[1]).toContain("Respuesta no disponible");
    expect(cells.slice(0, -1).join("")).not.toContain("Ver Datos");
    expect(cells[4].match(/<button[^>]*>Ver Datos<\/button>/)?.[0]).toContain('disabled=""');
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0];
    expect(checkbox?.includes('disabled=""')).toBe(!selected);
    expect(checkbox?.includes('checked=""')).toBe(selected);
  });

  it.each(["sin selección", "checkbox", "grant activo"])("con %s conserva identidad oculta y ubicación visible", (state) => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={candidates} isPending={false} query=""
      selectedTokens={new Set(state === "sin selección" ? [] : ["b"])}
      viewableTokens={new Set(state === "grant activo" ? ["a"] : [])}
      onViewCandidate={state === "grant activo" ? () => {} : undefined}
      onCandidateChange={() => {}} onQueryChange={() => {}}
    />);
    for (const value of ["Valdivia", "Puerto Varas", "Región de Los Ríos", "Región de Los Lagos", "#12", "#112"]) {
      expect(html).toContain(value);
    }
    for (const value of ["An****", "ana*****", "Lu****", "lui*****", "Ana Pérez", "Luis Soto", "ana@example.test", "luis@example.test"]) {
      expect(html).not.toContain(value);
    }
    expect(html.match(/Ganador guardado/g)).toHaveLength(1);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    const headers = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]*>/g, ""));
    expect(headers).toEqual(["Elegir", "Participante número", "Región", "Comuna", "Acciones"]);
    const rows = html.match(/<tbody>.*?<\/tbody>/)?.[0].match(/<tr\b[^>]*>.*?<\/tr>/g) ?? [];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const cells = row.match(/<td\b[^>]*>.*?<\/td>/g)!;
      expect(cells).toHaveLength(5);
      expect(cells.slice(0, -1).join("")).not.toContain("Ver Datos");
      expect(cells[4]).toContain("Ver Datos");
    }
    expect(html.match(/Ver Datos/g) ?? []).toHaveLength(2);
    const detailButtons = html.match(/<tbody>(.*?)<\/tbody>/)?.[1].match(/<button[^>]*>Ver Datos<\/button>/g) ?? [];
    expect(detailButtons).toHaveLength(2);
    expect(detailButtons.filter((button) => !button.includes('disabled=""'))).toHaveLength(state === "grant activo" ? 1 : 0);
    expect(detailButtons[1]).toContain('disabled=""');
    expect(html).not.toContain("<dialog");
  });

  it("tokens seleccionados sin callback de lectura nunca habilitan controles de detalle", () => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={candidates} isPending={false} query="" selectedTokens={new Set(["a", "b"])}
      viewableTokens={new Set(["a", "b"])} onCandidateChange={() => {}} onQueryChange={() => {}}
    />);
    const detailButtons = html.match(/<tbody>(.*?)<\/tbody>/)?.[1].match(/<button[^>]*>Ver Datos<\/button>/g) ?? [];
    expect(detailButtons).toHaveLength(2);
    expect(detailButtons.every((button) => button.includes('disabled=""'))).toBe(true);
  });

  it.each([undefined, new Set<string>(), new Set(["otro"])])("sin grant coincidente (%s) el callback y la selección no habilitan la última acción", (viewableTokens) => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={candidates} isPending={false} query="" selectedTokens={new Set(["a", "b"])}
      viewableTokens={viewableTokens} onViewCandidate={() => {}}
      onCandidateChange={() => {}} onQueryChange={() => {}}
    />);
    const rows = html.match(/<tbody>.*?<\/tbody>/)?.[0].match(/<tr\b[^>]*>.*?<\/tr>/g) ?? [];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const cells = row.match(/<td\b[^>]*>.*?<\/td>/g)!;
      expect(cells).toHaveLength(5);
      expect(cells.slice(0, -1).join("")).not.toContain("Ver Datos");
      expect(cells[4].match(/<button[^>]*>Ver Datos<\/button>/)?.[0]).toContain('disabled=""');
    }
    expect(html).not.toContain("<dialog");
  });
});