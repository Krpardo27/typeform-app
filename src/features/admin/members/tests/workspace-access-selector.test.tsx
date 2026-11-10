import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceAccessSelector } from "../../workspaces/components/WorkspaceAccessSelector";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

type Props = ComponentProps<typeof WorkspaceAccessSelector>;

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    workspaces: [
      { id: "radio-1", name: "Radio Norte", typeformId: "TF-NORTE" },
      { id: "radio-2", name: "Radio Sur", typeformId: "TF-SUR" },
    ],
    assignments: [
      { workspaceId: "radio-1", role: "EDITOR" },
      { workspaceId: "radio-2", role: "VIEWER" },
    ],
    query: "",
    onQueryChange: vi.fn(),
    onToggleWorkspace: vi.fn(),
    onRoleChange: vi.fn(),
    onClear: vi.fn(),
    workspaceDescription: "Selecciona los workspaces que podrá consultar.",
    emptySelectionDescription: "Agrega un workspace para configurar su rol.",
    ...overrides,
  };
}

function render(props: Props) {
  return renderToStaticMarkup(<WorkspaceAccessSelector {...props} />);
}

function inputs(html: string) {
  return [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => tag);
}

function roleFields(html: string) {
  return [...html.matchAll(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/g)].map(([fieldset]) => fieldset);
}

describe("WorkspaceAccessSelector", () => {
  it("usa el logo como opción pulsable y lo repite en el workspace seleccionado", () => {
    const source = radioWorkspaceTemplates[0];
    const props = makeProps({
      workspaces: [{ id: "radio-1", ...source }],
      assignments: [{ workspaceId: "radio-1", role: "EDITOR" }],
    });
    const html = render(props);
    const button = html.match(/<button\b[^>]*aria-label="Seleccionar workspace CONCIERTO"[^>]*>[\s\S]*?<\/button>/)?.[0];
    expect(button).toContain('aria-pressed="true"');
    expect(button).toContain('alt="Logo de CONCIERTO"');
    expect(button).toContain('width="64"');
    expect(button).not.toContain(">CONCIERTO<");
    expect(html.match(/alt="Logo de CONCIERTO"/g)).toHaveLength(2);
    expect(html).toContain('width="48"');
    expect(html).toContain('value="EDITOR"');
    expect(html).toContain('value="VIEWER"');
  });

  it("distingue dos workspaces de la misma radio mediante etiquetas y nombres accesibles", () => {
    const source = radioWorkspaceTemplates[0];
    const html = render(makeProps({ workspaces: [
      { id: "radio-1", ...source },
      { id: "radio-clon", name: "Promociones", typeformId: "clon", templateFormTypeformId: source.templateFormTypeformId },
    ], assignments: [] }));
    expect(html).toContain('aria-label="Seleccionar workspace Promociones"');
    expect(html.match(/alt="Logo de CONCIERTO"/g)).toHaveLength(2);
    expect(html).toContain(">Promociones</span>");
    expect(html).toContain(">CONCIERTO</span>");
  });

  it("mantiene los controles deshabilitados también en las opciones con logo", () => {
    const html = render(makeProps({ workspaces: [{ id: "radio-1", ...radioWorkspaceTemplates[0] }], assignments: [], disabled: true }));
    expect(html).toMatch(/<button\b[^>]*disabled=""[^>]*aria-label="Seleccionar workspace CONCIERTO"/);
    expect(html).toContain("concierto.png");
  });

  it("renderiza radios nativos con labels asociados y nombres de grupo distintos por workspace, sin sombras", () => {
    const html = render(makeProps());
    const fields = roleFields(html);

    expect(html).toContain('aria-label="Selección de workspaces y roles"');
    expect(fields).toHaveLength(2);
    const groupNames: string[] = [];
    fields.forEach((field, index) => {
      expect(field).toContain(`<legend class="sr-only">Rol en Radio ${index === 0 ? "Norte" : "Sur"}</legend>`);
      const radios = inputs(field);
      expect(radios).toHaveLength(2);
      radios.forEach((radio, roleIndex) => {
        expect(radio).toContain('type="radio"');
        const id = radio.match(/\bid="([^"]+)"/)?.[1];
        const name = radio.match(/\bname="([^"]+)"/)?.[1];
        expect(id).toBeTruthy();
        expect(name).toBeTruthy();
        expect(field).toContain(`for="${id}"`);
        const label = [...field.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)]
          .find(([tag]) => tag.includes(`for="${id}"`))?.[0];
        expect(label).toContain(roleIndex === 0 ? "Lector</label>" : "Editor</label>");
        expect(radio).toContain(`value="${roleIndex === 0 ? "VIEWER" : "EDITOR"}"`);
        expect(radio.includes('checked=""')).toBe(index === 0 ? roleIndex === 1 : roleIndex === 0);
        if (roleIndex === 0) groupNames.push(name!);
        else expect(name).toBe(groupNames[index]);
      });
      const hintId = field.match(/aria-describedby="([^"]+)"/)?.[1];
      expect(hintId).toBeTruthy();
      expect(field).toContain(`id="${hintId}"`);
    });
    expect(new Set(groupNames).size).toBe(2);
    expect(new Set(inputs(html).map((input) => input.match(/\bid="([^"]+)"/)?.[1])).size).toBe(5);
    expect(html).not.toMatch(/shadow|box-shadow|drop-shadow/i);
    expect(html).toContain('aria-label="Quitar workspace Radio Norte"');
    expect(html).toContain('aria-label="Quitar workspace Radio Sur"');
    expect(html).toContain("Permite duplicar formularios base en este workspace.");
    expect(html).toContain("Consulta de formularios y respuestas.");
  });

  it("asocia el buscador con una etiqueta sr-only y su descripción, no solo un placeholder", () => {
    const props = makeProps();
    const html = render(props);
    const search = inputs(html).find((input) => input.includes('type="search"'))!;
    const id = search.match(/\bid="([^"]+)"/)?.[1];
    const descriptionId = search.match(/aria-describedby="([^"]+)"/)?.[1];

    expect(search).toBeTruthy();
    expect(id).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`<label for="${id}" class="sr-only">Buscar workspaces por nombre o Typeform ID</label>`);
    expect(html).toContain(`<p id="${descriptionId}" class="mt-1 text-sm text-[#595954]">${props.workspaceDescription}</p>`);
  });

  it.each([true, false])("aplica disabled=%s a todos los inputs, botones y fieldsets", (disabled) => {
    const html = render(makeProps({ disabled }));
    const controls = [...html.matchAll(/<(?:input|button|fieldset)\b[^>]*>/g)].map(([tag]) => tag);

    // Buscador, cuatro radios, limpiar, dos selectores, dos botones quitar y dos fieldsets.
    expect(controls).toHaveLength(12);
    expect(inputs(html)).toHaveLength(5);
    expect([...html.matchAll(/<button\b/g)]).toHaveLength(5);
    controls.forEach((control) => expect(/\sdisabled=""/.test(control)).toBe(disabled));
  });

  it.each([" norte ", " tf-norte ", "sin coincidencias"])(
    "conserva todas las asignaciones y sus roles al filtrar por %j", (query) => {
      const props = makeProps();
      const original = structuredClone(props.assignments);
      const before = render(props);
      const filtered = render({ ...props, query });
      const after = render({ ...props, query: "" });

      expect(before).toContain('aria-label="Seleccionar workspace Radio Sur"');
      expect(filtered).not.toContain('aria-label="Seleccionar workspace Radio Sur"');
      if (query === "sin coincidencias") {
        expect(filtered).not.toContain('aria-label="Seleccionar workspace Radio Norte"');
        expect(filtered).toContain("No hay workspaces que coincidan con la búsqueda.");
      } else {
        expect(filtered).toMatch(/<button\b[^>]*aria-pressed="true"[^>]*aria-label="Seleccionar workspace Radio Norte"/);
      }
      for (const html of [before, filtered, after]) {
        expect(roleFields(html)).toHaveLength(2);
        expect(html).toContain('aria-label="Quitar workspace Radio Norte"');
        expect(html).toContain('aria-label="Quitar workspace Radio Sur"');
        const checkedRoles = inputs(html).filter((input) => input.includes('checked=""'))
          .map((input) => input.match(/\bvalue="([^"]+)"/)?.[1]);
        expect(checkedRoles).toEqual(["EDITOR", "VIEWER"]);
      }
      expect(after).toMatch(/<button\b[^>]*aria-pressed="true"[^>]*aria-label="Seleccionar workspace Radio Sur"/);
      expect(props.assignments).toEqual(original);
      expect(props.onQueryChange).not.toHaveBeenCalled();
      expect(props.onToggleWorkspace).not.toHaveBeenCalled();
      expect(props.onRoleChange).not.toHaveBeenCalled();
      expect(props.onClear).not.toHaveBeenCalled();
    },
  );

  it("muestra el estado sin selección y los botones de workspace sin pulsar", () => {
    const props = makeProps({ assignments: [] });
    const html = render(props);

    expect(html).toContain("Sin workspaces seleccionados");
    expect(html).toContain(props.emptySelectionDescription);
    expect(html).not.toContain('aria-label="Quitar todos los workspaces seleccionados"');
    expect(roleFields(html)).toHaveLength(0);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
  });

  it("distingue el catálogo vacío de una búsqueda sin resultados", () => {
    const html = render(makeProps({ workspaces: [], assignments: [] }));

    expect(html).toContain("No hay workspaces disponibles para asignar.");
    expect(html).not.toContain("No hay workspaces que coincidan con la búsqueda.");
    expect(inputs(html)).toHaveLength(1);
    expect(html).not.toContain("<button");
  });
});