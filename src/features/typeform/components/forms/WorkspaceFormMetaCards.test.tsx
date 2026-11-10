import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceFormMetaCards } from "./WorkspaceFormMetaCards";

vi.mock("@/shared/components/CopyButton", () => ({
  CopyButton: ({ value, label }: { value: string; label: string }) => (
    <button data-copy={value}>{label}</button>
  ),
}));

describe("WorkspaceFormMetaCards", () => {
  it("copia el ID actual, no el de origen, cuando no hay iframe", () => {
    const html = renderToStaticMarkup(<WorkspaceFormMetaCards
      formId="current-form"
      clonedFrom="source-form"
      embedInfo={{ code: "current-form", label: "ID" }}
    />);

    expect(html).toContain('data-copy="current-form"');
    expect(html).not.toContain('data-copy="source-form"');
    expect(html).toContain("Formulario de origen");
    expect(html).toContain("source-form");
    expect(html).toContain("Copiar ID");
  });

  it("muestra y copia el código sin renderizar un iframe ejecutable", () => {
    const code = '<iframe src="https://example.com/current-form"></iframe>';
    const html = renderToStaticMarkup(<WorkspaceFormMetaCards
      formId="current-form"
      embedInfo={{ code, label: "Código iframe", src: "https://example.com/current-form" }}
    />);

    expect(html).toContain("Copiar código");
    expect(html).toContain("&lt;iframe");
    expect(html).not.toContain("<iframe");
    expect(html).toContain('aria-label="Código iframe del formulario actual"');
    expect(html).not.toContain("Formulario de origen");
  });

  it.each([undefined, "", "  ", "current-form"])("no inventa un origen diferente para %j", (clonedFrom) => {
    const html = renderToStaticMarkup(<WorkspaceFormMetaCards
      formId="current-form"
      clonedFrom={clonedFrom}
      embedInfo={{ code: "current-form", label: "ID" }}
    />);

    expect(html).not.toContain("Formulario de origen");
    expect(html).toContain('data-copy="current-form"');
    expect(html).toContain('tabindex="0"');
  });
});