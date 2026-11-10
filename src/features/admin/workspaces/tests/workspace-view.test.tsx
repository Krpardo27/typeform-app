import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import {
  ADN_TEMPLATE_FORM_ID,
  ADN_TYPEFORM_ID,
  LOS40_TEMPLATE_FORM_ID,
  LOS40_TYPEFORM_ID,
} from "@/features/typeform/utils/embed-info";
import { AdminWorkspaceFormCard } from "../components/AdminWorkspaceFormCard";
import {
  getFormDate,
  getFormVisibility,
  getWorkspaceFormUrl,
  parseWorkspacePage,
  parseWorkspacePageSize,
} from "../utils/workspace-view";

const form: TypeformFormSummary = { id: "form-remoto", title: "Encuesta mensual" };

describe("parseWorkspacePage", () => {
  it.each([
    ["1", 1], ["2", 2], ["999", 999], ["002", 2],
    [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
  ])("acepta el entero positivo completo %j", (value, expected) => {
    expect(parseWorkspacePage(value)).toBe(expected);
  });

  it.each([
    undefined, null, "", "0", "-1", "+2", " 2", "2 ", "2\n", "2.0", "2.5",
    "2abc", "2e1", "0x10", "Infinity", "NaN", "9007199254740992",
    "9999999999999999999999999999999999999999", 2, NaN, Infinity, true, [], ["2"], {},
  ])("vuelve a 1 sin coerción ni parsing parcial para %j", (value) => {
    expect(parseWorkspacePage(value)).toBe(1);
  });
});

describe("parseWorkspacePageSize", () => {
  it.each([["12", 12], ["24", 24], ["48", 48], ["024", 24]])(
    "acepta exclusivamente un tamaño permitido: %j", (value, expected) => {
      expect(parseWorkspacePageSize(value)).toBe(expected);
    },
  );

  it.each([
    undefined, null, "", "0", "1", "13", "999", "all", "24abc", "24.0", "2.4e1",
    "+24", " 24", "24 ", "24\n", "0x18", "9007199254740992", 24, true, ["24"], {},
  ])("usa 12 ante un tamaño inválido o no admitido: %j", (value) => {
    expect(parseWorkspacePageSize(value)).toBe(12);
  });
});

describe("getFormVisibility", () => {
  it.each([
    [true, "Público"], [false, "Privado"], [undefined, "Visibilidad no informada"],
  ] as const)("distingue la visibilidad %j", (value, expected) => {
    expect(getFormVisibility(value)).toBe(expected);
  });
});

describe("getFormDate", () => {
  it.each([undefined, null, "", "no-es-fecha", "2026-13-40", new Date(NaN)])(
    "no muestra fechas ausentes o inválidas: %j", (value) => {
      expect(getFormDate(value)).toBeNull();
    },
  );

  it.each(["2026-11-02T23:30:00-03:00", new Date("2026-11-03T02:30:00Z")])(
    "formatea en es-CL y UTC, independientemente del huso original", (value) => {
      expect(getFormDate(value)).toEqual({
        dateTime: "2026-11-03T02:30:00.000Z",
        label: "3 nov 2026",
      });
    },
  );
});

describe("getWorkspaceFormUrl", () => {
  it.each([
    ["https://example.com/to/form", "https://example.com/to/form"],
    ["http://example.com/to/form", "http://example.com/to/form"],
    ["https://example.com", "https://example.com/"],
  ])("permite y normaliza enlaces públicos HTTP(S): %s", (display, expected) => {
    expect(getWorkspaceFormUrl({ ...form, _links: { display } }, "otro-workspace", null)).toBe(expected);
  });

  it.each([
    undefined, "", "no-es-url", "/to/form", "//example.com/to/form", "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>", "file:///tmp/form", "ftp://example.com/form",
  ])("no ofrece un enlace inválido o de protocolo inseguro: %j", (display) => {
    expect(getWorkspaceFormUrl({ ...form, _links: { display } }, "otro-workspace", null)).toBeNull();
  });

  it.each([
    [ADN_TYPEFORM_ID, null, "https://prisa.typeform.com/to/form-remoto"],
    [LOS40_TYPEFORM_ID, null, "https://concursos.los40.cl/t/?id=form-remoto"],
    ["workspace-clonado", ADN_TEMPLATE_FORM_ID, "https://prisa.typeform.com/to/form-remoto"],
    ["workspace-clonado", LOS40_TEMPLATE_FORM_ID, "https://concursos.los40.cl/t/?id=form-remoto"],
    [ADN_TYPEFORM_ID, LOS40_TEMPLATE_FORM_ID, "https://prisa.typeform.com/to/form-remoto"],
    [LOS40_TYPEFORM_ID, ADN_TEMPLATE_FORM_ID, "https://concursos.los40.cl/t/?id=form-remoto"],
  ])("respeta dominio de radio y prioridad del workspace %s / plantilla %s", (workspaceId, templateId, expected) => {
    expect(getWorkspaceFormUrl({
      ...form,
      _links: { display: "https://enlace-alternativo.example/form" },
    }, workspaceId, templateId)).toBe(expected);
  });
});

describe("AdminWorkspaceFormCard", () => {
  it("renderiza título, descripción, ID, fechas UTC y enlace accesible y seguro", () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceFormCard
        form={{ ...form, title: "  Encuesta mensual  ", last_updated_at: "2026-11-02T23:30:00-03:00", settings: { is_public: true } }}
        workspaceTypeformId={LOS40_TYPEFORM_ID}
        templateFormTypeformId={null}
        appForm={{ description: "Descripción local", createdAt: new Date("2026-11-01T12:00:00Z") }}
      />,
    );

    expect(html).toContain(">Encuesta mensual</h3>");
    expect(html).toContain("Descripción local");
    expect(html).toContain("ID: form-remoto");
    expect(html).toContain("Público");
    expect(html).toContain("Actualizado");
    expect(html).toContain('<time dateTime="2026-11-03T02:30:00.000Z">3 nov 2026</time>');
    expect(html).toContain("Registrado en la app");
    expect(html).toContain('<time dateTime="2026-11-01T12:00:00.000Z">1 nov 2026</time>');
    expect(html).toContain('href="https://concursos.los40.cl/t/?id=form-remoto"');
    expect(html).toContain('aria-label="Abrir Encuesta mensual en una nueva pestaña"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Abrir formulario");
  });

  it("muestra fallbacks sin inventar visibilidad, fechas ni enlace", () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceFormCard
        form={{ ...form, title: " \t ", last_updated_at: "inválida", _links: { display: "javascript:alert(1)" } }}
        workspaceTypeformId="otro-workspace"
        templateFormTypeformId={null}
        appForm={{ description: null, createdAt: new Date(NaN) }}
      />,
    );

    expect(html).toContain("Formulario sin título");
    expect(html).toContain("Visibilidad no informada");
    expect(html).toContain("Sin fecha informada");
    expect(html).toContain("Enlace no disponible");
    expect(html).not.toContain("Registrado en la app");
    expect(html).not.toContain("<time");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("javascript:");
  });

  it("muestra privado y el aria-label del título alternativo sin registro local", () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceFormCard
        form={{ ...form, title: "", settings: { is_public: false } }}
        workspaceTypeformId={ADN_TYPEFORM_ID}
        templateFormTypeformId={null}
      />,
    );

    expect(html).toContain("Privado");
    expect(html).toContain('aria-label="Abrir Formulario sin título en una nueva pestaña"');
    expect(html).toContain('href="https://prisa.typeform.com/to/form-remoto"');
    expect(html).toContain("Sin fecha informada");
    expect(html).not.toContain("Registrado en la app");
  });
});