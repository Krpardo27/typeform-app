import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RandomSelectionControls } from "./RandomSelectionControls";
import { SelectionFooter } from "./SelectionFooter";
import { SelectionStatus } from "./SelectionStatus";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import { WinnerSelectionPanel } from "./WinnerSelectionPanel";

const noop = () => {};
const controlsProps = {
  filteredCandidatesCount: 12,
  isPending: false,
  maxRandomWinnerCount: 12,
  randomWinnerCount: "2",
  reason: "Selección manual de ganadores",
  regionFilter: "",
  regionOptions: ["Norte", "Sur"],
  safeRandomWinnerCount: 2,
  onRandomWinnerCountChange: noop,
  onReasonChange: noop,
  onRegionFilterChange: noop,
  onSelectRandomWinners: noop,
};

describe("controles SSR de ganadores", () => {
  it.each([0, 2])("anuncia solo el contador (%s resultados), sin convertir la tabla en una región live", (count) => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={Array.from({ length: count }, (_, index) => ({ token: `candidate-${index}`, label: "Oc****", participantNumber: index + 1 }))}
      isPending={false} query="sin coincidencias" selectedTokens={new Set()}
      onCandidateChange={noop} onQueryChange={noop}
    />);
    const statuses = html.match(/<span\b[^>]*role="status"[^>]*>.*?<\/span>/g) ?? [];
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(statuses).toHaveLength(1);
    const status = statuses[0]!;
    expect(status).toContain('aria-atomic="true"');
    expect(status.replace(/<[^>]*>/g, "")).toBe(`${count} participantes`);
    expect(status).not.toMatch(/<table|<input|seleccionados visibles/);
    // role=status ya aporta live=polite implícito; no anunciar filas o controles.
    expect(html).not.toContain("aria-live=");
    expect(html.match(/<(?:div|table|thead|tbody|tr)\b[^>]*(?:role="(?:status|alert|log)"|aria-atomic=)/g) ?? []).toEqual([]);
    expect(html.indexOf(status)).toBeLessThan(html.indexOf('role="region"'));
    if (count === 0) {
      expect(html).toContain("No hay participantes que coincidan con los filtros actuales.");
      expect(html).not.toContain("con la búsqueda");
      expect(html).not.toContain("<table");
    } else {
      expect(html).toContain("<table");
      expect(html).not.toContain("No hay participantes");
    }
  });

  it("cada tabla enlaza sus tres botones a una descripción de orden visible y propia", () => {
    const props = {
      candidates: [{ token: "a", label: "Oc****", participantNumber: 1 }],
      isPending: false, query: "", selectedTokens: new Set<string>(),
      onCandidateChange: noop, onQueryChange: noop,
    };
    const html = renderToStaticMarkup(<><WinnerCandidatesTable {...props} /><WinnerCandidatesTable {...props} /></>);
    const descriptions = [...html.matchAll(/<p\b[^>]*id="([^"]+)"[^>]*>(.*?)<\/p>/g)];
    expect(descriptions).toHaveLength(2);
    expect(new Set(descriptions.map(([, id]) => id)).size).toBe(2);
    for (const [paragraph, id, text] of descriptions) {
      expect(paragraph).not.toContain("sr-only");
      expect(text).toBe("Ganadores guardados primero. Sin orden de columna se conserva el orden original dentro de cada grupo.");
      const buttons = (html.match(/<button\b[^>]*>/g) ?? []).filter((button) => button.includes(`aria-describedby="${id}"`));
      expect(buttons).toHaveLength(3);
      for (const button of buttons) expect(button).toMatch(/aria-label="Ordenar por (?:Participante número|Región|Comuna)\. Sin orden"/);
    }
    expect(html).not.toContain("aria-sort=");
  });

  it("solo ausentes conserva selección, explica la retirada explícita y no permite sorteo ni lectura", () => {
    const html = renderToStaticMarkup(<WinnerSelectionPanel
      action={noop} candidates={[{ token: "opaque-token", label: "Participante no disponible", selected: true, missingResponse: true, participantNumber: 1 }]}
      currentPage={1} itemsPerPage={1} initialRegionFilter="Sur"
    />);
    expect(html).toContain("Respuesta no disponible");
    expect(html).toContain("No se han retirado automáticamente");
    expect(html).toContain("Retira los ausentes antes de confirmar cambios");
    expect(html).toContain("Se sortearán 0 participantes");
    expect(html).toContain("1 seleccionados en total");
    expect(html.replace(/<[^>]*>/g, "")).not.toContain("opaque-token");
    expect(html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0]).not.toContain('disabled=""');
    expect(html.match(/<button[^>]*type="submit"[^>]*>/)?.[0]).toContain('disabled=""');
  });

  it("asocia labels y ayudas a controles con IDs únicos por instancia", () => {
    const html = renderToStaticMarkup(<>
      <RandomSelectionControls {...controlsProps} />
      <RandomSelectionControls {...controlsProps} />
    </>);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = [...html.matchAll(/<label[^>]+for="([^"]+)"/g)];
    expect(labels).toHaveLength(6);
    for (const [, id] of labels) {
      expect(html).toMatch(new RegExp(`<(?:input|select)[^>]+id="${id}"`));
    }
    const descriptions = [...html.matchAll(/aria-describedby="([^"]+)"/g)];
    expect(descriptions).toHaveLength(8);
    for (const [, id] of descriptions) expect(ids).toContain(id);
    expect(html).toContain('name="reason"');
    expect(html).toContain('step="1"');
    expect(html).not.toContain("disabled=");
  });

  it("bloquea región, cantidad, motivo y sorteo durante confirmación o guardado", () => {
    const html = renderToStaticMarkup(<RandomSelectionControls {...controlsProps} isPending />);
    const controls = html.match(/<(?:input|select|button)\b[^>]*>/g)!;
    expect(controls).toHaveLength(4);
    for (const control of controls) expect(control).toContain('disabled=""');
    expect(html).not.toContain("Sorteando");
    expect(html).not.toContain("animate-spin");
  });

  it("sin candidatos no permite sortear, pero sí editar el motivo", () => {
    const html = renderToStaticMarkup(<RandomSelectionControls
      {...controlsProps} filteredCandidatesCount={0} regionOptions={[]}
    />);
    expect(html.match(/<button\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(html.match(/<input[^>]*name="reason"[^>]*>/)?.[0]).not.toContain('disabled=""');
    expect(html).toContain("Se sortearán 0 participantes");
  });

  it("la pausa tras un sorteo bloquea solo Sortear, sin simular una carga", () => {
    const html = renderToStaticMarkup(<RandomSelectionControls {...controlsProps} isRandomCooldown />);
    expect(html.match(/<button\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(html).toContain("Sorteo realizado");
    for (const control of html.match(/<(?:input|select)\b[^>]*>/g)!) {
      expect(control).not.toContain('disabled=""');
    }
    expect(html).not.toContain("animate-spin");
    expect(html).not.toContain("Sorteando");
  });

  it("explica que el sorteo reemplaza toda la selección incluyendo ocultos", () => {
    const html = renderToStaticMarkup(<RandomSelectionControls {...controlsProps} />);
    expect(html).toContain("Sortear y reemplazar selección");
    expect(html).toContain("Reemplaza toda la selección");
    expect(html).toContain("seleccionados fuera del filtro");
    expect(html).toContain("participantes cargados según búsqueda y región");
  });

  it("mantiene los campos controlados y región disponible aunque no haya coincidencias", () => {
    const html = renderToStaticMarkup(<RandomSelectionControls
      {...controlsProps} filteredCandidatesCount={0} regionFilter="Sur"
      randomWinnerCount="" reason="Revisión del concurso"
    />);
    expect(html.match(/<select\b[^>]*>/)?.[0]).not.toContain("disabled=");
    expect(html).toContain('<option value="Sur" selected="">Sur</option>');
    expect(html.match(/<input[^>]*type="number"[^>]*>/)?.[0]).toContain('value=""');
    expect(html.match(/<input[^>]*name="reason"[^>]*>/)?.[0]).toContain('value="Revisión del concurso"');
    expect(html).toContain("La selección fuera del filtro se conserva");
    expect(html).toContain("space-y-3");
    expect(html).toContain("p-4");
    expect(html).not.toContain("grid-cols-");
    expect(html).not.toContain("col-span-");
    expect(html.match(/<button\b[^>]*>/)?.[0]).toContain("min-h-11");
  });

  it.each([
    ["sin cambios", false, false, 0, "Confirmar ganadores"],
    ["preview con cambios", false, true, 3, "Confirmar ganadores"],
    ["selección real", true, true, 3, "Confirmar ganadores"],
    ["retirada", true, true, 0, "Quitar ganadores"],
  ] as const)("conserva la acción visible en %s", (_, canSubmitSelection, hasSelectionChanged, selectedCount, label) => {
    const html = renderToStaticMarkup(<SelectionFooter
      canSubmitSelection={canSubmitSelection} hasSelectionChanged={hasSelectionChanged}
      isPending={false} selectedCount={selectedCount} hiddenSelectedCount={0} onClearSelection={noop}
      disabledReason={!canSubmitSelection && hasSelectionChanged ? "Modo prueba local: guardado desactivado." : undefined}
    />);
    const submit = html.match(/<button\b[^>]*type="submit"[^>]*>(.*?)<\/button>/)!;
    expect(submit[1]).toBe(label);
    expect(submit[0].includes('disabled=""')).toBe(!canSubmitSelection);
    if (!canSubmitSelection && hasSelectionChanged) {
      expect(html).toContain("Modo prueba local: guardado desactivado.");
      expect(html).not.toContain("Sin cambios");
    }
  });

  it("usa un único submit propio y bloquea también limpiar", () => {
    const html = renderToStaticMarkup(<SelectionFooter
      canSubmitSelection hasSelectionChanged isPending isConfirming
      selectedCount={3} hiddenSelectedCount={2} onClearSelection={noop}
    />);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).not.toContain('<input');
    expect(html).toContain("Confirmando...");
    expect(html).toContain("2 fuera del filtro");
    for (const button of html.match(/<button\b[^>]*>/g)!) {
      expect(button).toContain('disabled=""');
    }
  });

  it("tabla TanStack tiene caption, región desplazable enfocables y búsqueda bloqueada", () => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={[{ token: "a", label: "An****", participantNumber: 12 }]}
      isPending query="12" selectedTokens={new Set(["a", "oculto"])}
      onCandidateChange={noop} onQueryChange={noop}
    />);
    expect(html).toContain('<caption');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("1 seleccionados visibles · 2 en total");
    expect(html).toContain("accent-[#C4513D]");
    for (const input of html.match(/<input\b[^>]*>/g)!) {
      expect(input).toContain('disabled=""');
    }
    const searchId = html.match(/<input[^>]+id="([^"]+)"/)?.[1];
    expect(html).toContain(`for="${searchId}"`);
  });

  it("muestra cinco columnas sin nombre/email y con región/comuna visibles", () => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={[
        { token: "TOKEN-PRIVADO-A", label: "An****", email: "ana*****", city: "Valdivia", region: "Región de Los Ríos", participantNumber: 12 },
        { token: "TOKEN-PRIVADO-B", label: "Lu****", selected: true, participantNumber: 112 },
      ]}
      isPending={false} query="" selectedTokens={new Set(["TOKEN-PRIVADO-B"])}
      onCandidateChange={noop} onQueryChange={noop}
    />);
    const headers = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]*>/g, ""));
    expect(headers).toEqual(["Elegir", "Participante número", "Región", "Comuna", "Acciones"]);
    const rows = [...html.matchAll(/<tbody>(.*?)<\/tbody>/g)][0][1].match(/<tr\b[^>]*>.*?<\/tr>/g)!;
    for (const row of rows) {
      const cells = row.match(/<td\b[^>]*>.*?<\/td>/g)!;
      expect(cells).toHaveLength(5);
      expect(cells[4]).toContain("Ver Datos");
      expect(cells.slice(0, 4).join("")).not.toContain("Ver Datos");
      expect(cells[4].match(/<button\b[^>]*>/)?.[0]).toContain('disabled=""');
    }
    const winnerReference = rows[0].match(/<td\b[^>]*>(.*?)<\/td>/g)?.[1];
    expect(winnerReference).toContain("#112");
    expect(winnerReference).toContain("Ganador guardado");
    expect(rows[1].match(/<td\b[^>]*>(.*?)<\/td>/g)?.[1]).toContain("#12");
    for (const text of ["Valdivia", "Región de Los Ríos", "#12", "#112", "Ganador guardado"]) expect(html).toContain(text);
    for (const text of ["An****", "ana*****", "Lu****"]) expect(html).not.toContain(text);
    expect(html).toContain("w-full min-w-140");
    expect(html).not.toContain("min-w-160");
    expect(html).not.toContain("min-w-240");
    expect(html).not.toMatch(/<(?:td|th)\b[^>]*class="[^"]*min-w-/);
    expect(html).not.toContain("col-span-");
    expect(html).toContain("relative lg:max-h-88 overflow-auto");
    expect(html).toContain('placeholder="Buscar por número de participante, región o comuna"');
    expect(html).not.toMatch(/aria-describedby="[^"]*-search-hint"/);
    expect(html).toContain('aria-label="Seleccionar participante #12"');
    expect(html).toContain('aria-label="Seleccionar participante #112"');
    expect(html).toContain("Confirma a este participante como ganador");
    expect(html.replace(/<[^>]*>/g, "")).not.toContain("TOKEN-PRIVADO");
    expect(html.match(/aria-label="[^"]*"/g)?.join(" ")).not.toContain("TOKEN-PRIVADO");
    expect(html.match(/Ver Datos/g)).toHaveLength(2);
  });

  it("siempre ofrece Ver Datos en la última celda, habilitado solo con token y callback", () => {
    const props = {
      candidates: [
        { token: "a", label: "An****", email: "ana*****", city: "Valdivia", region: "Región de Los Ríos", participantNumber: 12, selected: true },
        { token: "b", label: "Lu****", participantNumber: 13 },
      ],
      isPending: false, query: "", selectedTokens: new Set<string>(),
      onCandidateChange: noop, onQueryChange: noop,
    };
    for (const unavailable of [
      { onViewCandidate: noop },
      { viewableTokens: new Set(["a"]) },
      { viewableTokens: new Set(["otro"]), onViewCandidate: noop },
    ]) {
      const unavailableHtml = renderToStaticMarkup(<WinnerCandidatesTable {...props} {...unavailable} />);
      expect(unavailableHtml.match(/Ver Datos/g)).toHaveLength(2);
      const tbody = unavailableHtml.match(/<tbody>(.*?)<\/tbody>/)![1];
      for (const button of tbody.match(/<button\b[^>]*>/g)!) expect(button).toContain('disabled=""');
    }
    const html = renderToStaticMarkup(<WinnerCandidatesTable {...props} viewableTokens={new Set(["a"])} onViewCandidate={noop} />);
    expect(html.match(/Ver Datos/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Ver datos del participante #12"');
    expect(html).toContain('aria-label="Ver datos del participante #13"');
    for (const text of ["Valdivia", "Región de Los Ríos"]) expect(html).toContain(text);
    for (const text of ["An****", "ana*****", "Lu****"]) expect(html).not.toContain(text);
    expect(html.match(/aria-label="[^"]*"/g)?.join(" ")).not.toMatch(/Los Ríos|ana\*\*\*\*\*|Valdivia/);
    const cells = html.match(/<td\b[^>]*>.*?<\/td>/g)!;
    expect(cells[1]).toContain("#12");
    expect(cells[1]).not.toContain("Ver Datos");
    expect(cells[4]).toContain("Ver Datos");
    expect(cells[9]).toContain("Ver Datos");
    expect(cells[4]).not.toContain('disabled=""');
    expect(cells[9]).toContain('disabled=""');
    expect(cells[4].match(/<button\b[^>]*>/)?.[0]).toContain("min-h-11");
    const pendingHtml = renderToStaticMarkup(<WinnerCandidatesTable {...props} isPending viewableTokens={new Set(["a"])} onViewCandidate={noop} />);
    const pendingBody = pendingHtml.match(/<tbody>(.*?)<\/tbody>/)![1];
    for (const button of pendingBody.match(/<button\b[^>]*>/g)!) expect(button).toContain('disabled=""');
  });

  it("conserva comuna visible como alternativa y usa guiones si faltan datos", () => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={[
        { token: "a", label: "An****", comuna: "Ñuñoa", region: "  Región de Los Ríos  " },
        { token: "b", label: "Lu****", region: "   " },
      ]}
      isPending={false} query="#12" selectedTokens={new Set()}
      onCandidateChange={noop} onQueryChange={noop}
    />);
    const cells = [...html.matchAll(/<td\b[^>]*>(.*?)<\/td>/g)].map((match) => match[1]);
    expect(cells[1].replace(/<[^>]*>/g, "")).toBe("Participante");
    expect(cells[2]).toBe("Región de Los Ríos");
    expect(cells[3]).toBe("Ñuñoa");
    expect(cells[6].replace(/<[^>]*>/g, "")).toBe("Participante");
    expect(cells.slice(7, 9)).toEqual(["-", "-"]);
    expect(html).toContain('value="#12"');
    expect(cells[4]).toContain("Ver Datos");
    expect(cells[9]).toContain("Ver Datos");
    expect(html).toContain('aria-label="Seleccionar participante sin número"');
    expect(html).toContain('aria-label="Ver datos del participante sin número"');
  });

  it("ofrece abrir el formulario público junto a las exportaciones sin salir de las respuestas", () => {
    const html = renderToStaticMarkup(<WinnerSelectionPanel
      action={noop} candidates={[]} currentPage={1} itemsPerPage={20}
      exportBaseHref="/export" publicFormUrl="https://example.test/concurso/actual"
    />);
    expect(html).toContain('href="https://example.test/concurso/actual"');
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Abrir formulario en una nueva pestaña"');
    expect(html.indexOf("Abrir formulario")).toBeGreaterThan(html.indexOf("Exportar ganadores"));
    expect(html).not.toContain("<dialog");
  });

  it("ofrece consultar ganadores guardados sin habilitar la reconfirmación de una selección idéntica", () => {
    const html = renderToStaticMarkup(<WinnerSelectionPanel
      beginWinnerData={async () => ({ status: "denied", message: "Sin acceso" })}
      readWinnerData={async () => ({ status: "denied", message: "Sin acceso" })}
      finishWinnerData={async () => {}}
      action={noop} candidates={[
        { token: "a", label: "An****", selected: true, region: "Norte" },
        { token: "b", label: "Lu****", selected: true, region: "Sur" },
      ]}
      currentPage={1} itemsPerPage={20} initialRegionFilter="Norte"
    />);
    expect(html).toContain("2 seleccionados en total · 1 fuera del filtro");
    expect(html).toMatch(/<button[^>]+type="submit"[^>]+disabled=""/);
    expect(html).toContain("Consultar ganadores guardados");
    expect(html).toContain("2 ganadores guardados.");
    expect(html).toContain("Sin cambios");
    expect(html).not.toContain("Selección guardada");
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]");
  });

  it("una selección manual no habilita el detalle de candidatos arbitrarios", () => {
    const html = renderToStaticMarkup(<WinnerCandidatesTable
      candidates={[{ token: "a", label: "An****" }, { token: "b", label: "Lu****" }]}
      isPending={false} query="" selectedTokens={new Set(["a"])}
      onCandidateChange={noop} onQueryChange={noop}
      viewableTokens={new Set()} onViewCandidate={noop}
    />);
    expect(html.match(/Ver Datos/g)).toHaveLength(2);
    const tbody = html.match(/<tbody>(.*?)<\/tbody>/)![1];
    for (const button of tbody.match(/<button\b[^>]*>/g)!) expect(button).toContain('disabled=""');
    expect(html.match(/<input[^>]+type="checkbox"[^>]+checked/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Seleccionar participante sin número"');
    expect(html).toContain('aria-label="Ver datos del participante sin número"');
    expect(html).toContain("1 seleccionados visibles · 1 en total");
  });

  it("muestra errores inesperados como alerta, sin inventar éxito", () => {
    const html = renderToStaticMarkup(<SelectionStatus
      hasSavedWinnerSelection feedback="No se pudo guardar la selección."
    />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("No se pudo guardar");
    expect(html).not.toContain("Selección guardada");
  });

  it("anuncia el resultado local como estado, no como error ni selección guardada", () => {
    const html = renderToStaticMarkup(<SelectionStatus
      hasSavedWinnerSelection={false}
      selectionNotice="Se seleccionaron 2 participantes. Revisa y confirma para guardar."
    />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("Revisa y confirma para guardar");
    expect(html).not.toContain("Selección guardada");
  });
});