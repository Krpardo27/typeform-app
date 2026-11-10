import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileUserIdentity } from "./MobileUserIdentity";

describe("MobileUserIdentity", () => {
  it("muestra la identidad compacta con correo normalizado e inicial decorativa", () => {
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ name: "  Ana Pérez  ", email: " ana@example.test " }} />);
    expect(html).toContain('aria-label="Cuenta actual"');
    expect(html).toContain('Usuario: <span class="font-semibold">ana@example.test</span>');
    expect(html).not.toContain("Ana Pérez");
    expect(html).not.toContain(" ana@example.test ");
    expect(html).toContain(">A</span>");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("lg:hidden");
  });

  it.each([undefined, null, "", "   "])("deriva la inicial del correo si no hay nombre válido: %j", (name) => {
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ name, email: "maria@example.test" }} />);
    expect(html).toContain('Usuario: <span class="font-semibold">maria@example.test</span>');
    expect(html).toContain(">M</span>");
  });

  it("mantiene una alternativa si los datos están vacíos", () => {
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ email: "" }} />);
    expect(html).toContain("Usuario: ");
    expect(html).toContain("Correo no disponible");
    expect(html).toContain(">U</span>");
  });

  it("mantiene correos largos completos sin recortarlos y no añade el nombre a la identidad compacta", () => {
    const name = "Nombre extenso ".repeat(12).trim();
    const email = `${"usuario".repeat(12)}@example.test`;
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ name, email }} />);
    expect(html).not.toContain(name);
    expect(html).toContain(">N</span>");
    expect(html).toContain(email);
    expect(html).toContain("min-w-0");
    expect(html).toContain("wrap-anywhere");
    expect(html).not.toContain("truncate");
  });

  it("escapa el contenido y no introduce otra acción de cuenta o de cierre de sesión", () => {
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ name: "<Ana & María>", email: "<ana&equipo>@example.test" }} />);
    expect(html).toContain("&lt;ana&amp;equipo&gt;@example.test");
    expect(html).toContain("&lt;</span>");
    expect(html).not.toContain("<ana&equipo>");
    expect(html).not.toMatch(/<button|<a\b|shadow|bg-/);
  });

  it.each(["", "   "])("conserva el correo de respaldo y la inicial del nombre si falta el correo: %j", (email) => {
    const html = renderToStaticMarkup(<MobileUserIdentity user={{ name: "  Érika  ", email }} />);
    expect(html).toContain("Correo no disponible");
    expect(html).toContain(">É</span>");
    expect(html).not.toContain("Érika");
  });
});