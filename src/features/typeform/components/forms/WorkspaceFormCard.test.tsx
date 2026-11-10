// @vitest-environment node

import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CopyButton } from "@/shared/components/CopyButton";
import {
  ADN_TEMPLATE_FORM_ID,
  ADN_TYPEFORM_ID,
  LOS40_TEMPLATE_FORM_ID,
  LOS40_TYPEFORM_ID,
} from "@/features/typeform/utils/embed-info";
import { WorkspaceFormCard } from "./WorkspaceFormCard";
import { WorkspaceFormsGrid } from "./WorkspaceFormsGrid";

vi.mock("./WorkspaceFormDuplicateButton", () => ({
  WorkspaceFormDuplicateButton: ({
    workspaceId,
    formId,
    formTitle,
  }: { workspaceId: string; formId: string; formTitle: string }) => (
    <button
      type="button"
      data-duplicate-button="true"
      data-workspace-id={workspaceId}
      data-form-id={formId}
      data-form-title={formTitle}
    >
      Duplicar formulario
    </button>
  ),
}));

type CardProps = ComponentProps<typeof WorkspaceFormCard>;
type CopyProps = ComponentProps<typeof CopyButton>;

const baseProps: CardProps = {
  workspaceId: "workspace-local",
  workspaceTypeformId: "workspace-generico",
  canCreateForms: true,
  form: {
    id: "form-abc123",
    title: "Concurso de prueba",
    _links: { display: "https://example.com/formulario?source=radio&lang=es" },
  },
};

function cardProps(overrides: Partial<CardProps> = {}): CardProps {
  return { ...baseProps, ...overrides };
}

function renderCard(overrides: Partial<CardProps> = {}) {
  return renderToStaticMarkup(<WorkspaceFormCard {...cardProps(overrides)} />);
}

// SSR no serializa los handlers ni el valor del portapapeles. Inspeccionamos
// las props del árbol sin ejecutar ni sustituir el CopyButton real con hooks.
function copyButtonProps(node: ReactNode): CopyProps[] {
  return Children.toArray(node).flatMap((child): CopyProps[] => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === CopyButton) return [child.props as CopyProps];
    return copyButtonProps(child.props.children);
  });
}

function openingTag(html: string, tag: string, marker: string) {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "g")) ?? [];
  const match = tags.find((candidate) => candidate.includes(marker));
  expect(match, `No se encontró <${tag}> con ${marker}`).toBeDefined();
  return match!;
}

function classes(tag: string) {
  const match = tag.match(/class="([^"]*)"/);
  expect(match).not.toBeNull();
  return match![1].split(/\s+/);
}

describe("WorkspaceFormCard (SSR)", () => {
  it("muestra el título largo completo sin clases que lo trunquen", () => {
    const title = "Un título extenso para un concurso de radio que debe permanecer completamente visible ".repeat(4).trim();
    const html = renderCard({ form: { ...baseProps.form, title: `  ${title}  ` } });

    expect(html).toContain(`>${title}</h2>`);
    expect(html).toContain(`aria-label="Ver respuestas de ${title}"`);
    expect(html).toContain(`data-form-title="${title}"`);
    expect(classes(openingTag(html, "h2", "class="))).toContain("wrap-anywhere");
    expect(html).not.toMatch(/(?:truncate|line-clamp|text-ellipsis|overflow-hidden|whitespace-nowrap)/);
  });

  it("título y Ver respuestas apuntan directamente a respuestas con IDs codificados", () => {
    const workspaceId = "radio / Chile?#á%";
    const formId = "concurso / verano?#ñ%";
    const detailHref = "/workspaces/radio%20%2F%20Chile%3F%23%C3%A1%25/forms/concurso%20%2F%20verano%3F%23%C3%B1%25";
    const html = renderCard({ workspaceId, form: { ...baseProps.form, id: formId } });

    expect(html).not.toContain(`href="${detailHref}"`);
    expect(html.match(new RegExp(`href="${detailHref}/responses"`, "g"))).toHaveLength(2);
    expect(html).toContain("Ver respuestas");
    expect(html).toContain(`data-workspace-id="${workspaceId}"`);
    expect(html).toContain(`data-form-id="${formId}"`);
  });

  it("conserva el enlace público y lo abre con protección en otra pestaña", () => {
    const html = renderCard();
    const external = openingTag(html, "a", 'target="_blank"');

    expect(external).toContain('href="https://example.com/formulario?source=radio&amp;lang=es"');
    expect(external).toContain('rel="noopener noreferrer"');
    expect(external).toContain('aria-label="Abrir Concurso de prueba en una nueva pestaña"');
    expect(html).toContain("Abrir formulario");
  });

  it.each([undefined, {}, { display: "" }])(
    "no añade Ver detalle ni otro enlace sin URL pública (%j)",
    (_links) => {
      const html = renderCard({ form: { ...baseProps.form, _links } });
      expect(html).not.toContain("Ver detalle");
      expect(html.match(/<a\b/g)).toHaveLength(2);
      expect(html).not.toContain('href="/workspaces/workspace-local/forms/form-abc123"');
      expect(html).not.toContain('target="_blank"');
      expect(html).not.toContain("Abrir formulario");
      expect(html).toContain("Copiar ID");
    },
  );

  const embedCases = [
    {
      radio: "ADN",
      workspaceTypeformId: ADN_TYPEFORM_ID,
      templateFormTypeformId: ADN_TEMPLATE_FORM_ID,
      src: "https://prisa.typeform.com/to/form-abc123",
      code: '<iframe frameborder="0" height="600" id="typeform-full" src="https://prisa.typeform.com/to/form-abc123" width="100%"></iframe>',
    },
    {
      radio: "LOS40",
      workspaceTypeformId: LOS40_TYPEFORM_ID,
      templateFormTypeformId: LOS40_TEMPLATE_FORM_ID,
      src: "https://concursos.los40.cl/t/?id=form-abc123",
      code: '<iframe id="concurso" width="100%" height="600px" referrerpolicy="unsafe-url" src="https://concursos.los40.cl/t/?id=form-abc123" scrolling="no" marginwidth="0" marginheight="0" style="border:none;"></iframe>',
    },
  ];

  describe.each(embedCases)("embed $radio", (embed) => {
    it.each(["workspace", "plantilla"] as const)(
      "conserva las URLs y el código de copia exactos al resolver por %s",
      (origin) => {
        const props = cardProps({
          workspaceTypeformId: origin === "workspace" ? embed.workspaceTypeformId : "workspace-nuevo",
          templateFormTypeformId: origin === "plantilla" ? embed.templateFormTypeformId : undefined,
          form: { ...baseProps.form, _links: undefined },
        });
        const html = renderToStaticMarkup(<WorkspaceFormCard {...props} />);
        const external = openingTag(html, "a", 'target="_blank"');

        expect(external).toContain(`href="${embed.src}"`);
        expect(external).toContain('rel="noopener noreferrer"');
        expect(copyButtonProps(WorkspaceFormCard(props))).toEqual([
          { value: embed.src, label: "Copiar src", variant: "subtle" },
          { value: embed.code, label: "Copiar iframe", variant: "subtle" },
        ]);
        expect(html).toContain("Copiar src");
        expect(html).toContain("Copiar iframe");
        expect(html).not.toContain("Copiar ID");
        expect(html).not.toContain("Ver detalle");
      },
    );

    it("respeta la precedencia del enlace público con display presente", () => {
      const html = renderCard({ workspaceTypeformId: embed.workspaceTypeformId });
      const external = openingTag(html, "a", 'target="_blank"');
      const expected = embed.radio === "LOS40"
        ? embed.src
        : "https://example.com/formulario?source=radio&amp;lang=es";

      expect(external).toContain(`href="${expected}"`);
    });
  });

  it("copia el ID real cuando no existe configuración de embed", () => {
    expect(copyButtonProps(WorkspaceFormCard(baseProps))).toEqual([
      { value: "form-abc123", label: "Copiar ID", variant: "subtle" },
    ]);
  });

  it("solo muestra duplicación cuando canCreateForms lo permite", () => {
    expect(renderCard()).toContain('data-duplicate-button="true"');
    const html = renderCard({ canCreateForms: false });

    expect(html).not.toContain("data-duplicate-button");
    expect(html).not.toContain("Duplicar formulario");
    expect(html).toContain("Ver respuestas");
    expect(html).toContain("Copiar ID");
  });

  it.each([true, false])("el grid conserva duplicación en cada tarjeta según canCreateForms=%s", (canCreateForms) => {
    const forms = [baseProps.form, { ...baseProps.form, id: "form-segundo", title: "Segundo concurso" }];
    const html = renderToStaticMarkup(
      <WorkspaceFormsGrid
        workspaceId={baseProps.workspaceId}
        workspaceTypeformId={baseProps.workspaceTypeformId}
        forms={forms}
        canCreateForms={canCreateForms}
      />,
    );

    expect(html.match(/<article\b/g)).toHaveLength(2);
    expect(html.match(/data-duplicate-button="true"/g) ?? []).toHaveLength(canCreateForms ? 2 : 0);
    for (const form of forms) {
      expect(html).toContain(`href="/workspaces/workspace-local/forms/${form.id}/responses"`);
      if (canCreateForms) {
        expect(html).toContain(`data-form-id="${form.id}"`);
        expect(html).toContain(`data-form-title="${form.title}"`);
      }
    }
  });

  it.each([undefined, "", "fecha-invalida", "2026-99-99T25:99:00Z"])(
    "no lanza errores ni crea time para una fecha ausente o inválida (%j)",
    (last_updated_at) => {
      let html = "";
      expect(() => {
        html = renderCard({ form: { ...baseProps.form, last_updated_at } });
      }).not.toThrow();

      expect(html).toContain("Sin fecha informada");
      expect(html).not.toContain("Actualizado");
      expect(html).not.toContain("<time");
      expect(html).not.toContain("Invalid Date");
    },
  );

  it.each([
    ["2026-11-02T03:04:00Z", "2026-11-02T03:04:00.000Z"],
    ["2026-11-01T23:04:00-04:00", "2026-11-02T03:04:00.000Z"],
  ])("normaliza %s y muestra fecha y hora UTC", (last_updated_at, iso) => {
    const html = renderCard({ form: { ...baseProps.form, last_updated_at } });
    const label = new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(iso));

    expect(openingTag(html, "time", "dateTime=")).toContain(`dateTime="${iso}"`);
    expect(html).toContain(`>${label} UTC</time>`);
    expect(html).not.toContain("Sin fecha informada");
  });

  it.each(["", "   ", "\t\n"])("usa un título alternativo para %j", (title) => {
    const html = renderCard({ form: { ...baseProps.form, title } });

    expect(html).toContain(">Formulario sin título</h2>");
    expect(html).toContain('data-form-title="Formulario sin título"');
    expect(html).toContain('aria-label="Ver respuestas de Formulario sin título"');
    expect(html).toContain('aria-label="Copiar datos de Formulario sin título"');
  });

  it.each([
    ["ID", "workspace-generico", ["Copiar ID"]],
    ["embed", ADN_TYPEFORM_ID, ["Copiar src", "Copiar iframe"]],
  ] as const)("renderiza acciones de copia %s sutiles con texto visible", (_kind, workspaceTypeformId, labels) => {
    const html = renderCard({ workspaceTypeformId });

    for (const label of labels) {
      const buttonClasses = classes(openingTag(html, "button", `aria-label="${label}"`));
      expect(buttonClasses).toEqual(expect.arrayContaining(["text-sm", "rounded-sm", "hover:underline", "text-[#595954]"]));
      expect(buttonClasses.some((name) => /shadow|translate|^border(?:-|$)|^bg-/.test(name))).toBe(false);
      expect(html).toMatch(new RegExp(`</svg>${label}</button>`));
    }
  });

  it("mantiene article rounded-md con borde coral sin sombras ni desplazamientos", () => {
    const html = renderCard();
    const articleClasses = classes(openingTag(html, "article", "class="));

    expect(articleClasses).toEqual(expect.arrayContaining([
      "rounded-md", "border", "border-[#FF5C35]/30", "bg-white", "transition-colors", "hover:border-[#FF5C35]/60",
    ]));
    expect(articleClasses.some((name) => /shadow|translate/.test(name))).toBe(false);
    const responsesClasses = classes(openingTag(html, "a", 'aria-label="Ver respuestas de'));
    expect(responsesClasses).toEqual(expect.arrayContaining(["rounded-md", "border-[#FF5C35]/35", "bg-[#FFF8F5]", "text-[#A53318]"]));
  });
});