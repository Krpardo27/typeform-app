import { describe, expect, it } from "vitest";
import { renderOtpEmail } from "./OtpEmail";

describe("renderOtpEmail", () => {
  it("conserva el código completo, incluidos ceros iniciales, sin introducir espacios", () => {
    const html = renderOtpEmail({ otp: "012345" });
    expect(html).toContain(">012345</p>");
    expect(html.match(/012345/g)).toHaveLength(1);
    expect(html).toContain("Válido durante 5 minutos");
    expect(html).toContain("código de 6 dígitos");
  });

  it("usa tablas de presentación y estilos inline sin depender de recursos externos", () => {
    const html = renderOtpEmail({ otp: "012345" });
    expect(html).toContain('<html lang="es"');
    expect(html).toContain("Plataforma de Formularios");
    expect(html).toContain("max-width:500px");
    expect(html).toContain("<!--[if mso]>");
    expect(html).not.toMatch(/<table\b[^>]*>\s*<\/table>/);
    expect(html).not.toMatch(/<script|<img|<link|@import|display:flex|display:grid/);
    expect(html).not.toContain("opacity:");
    expect(html.match(/<table\b/g)?.length).toBe(html.match(/role="presentation"/g)?.length);
  });

  it("mantiene equilibrada la estructura de tablas del documento", () => {
    const html = renderOtpEmail({ otp: "012345" }).replace(/<!--[\s\S]*?-->/g, "");
    for (const tag of ["table", "tr", "td"]) {
      expect(html.match(new RegExp(`<${tag}\\b`, "g"))?.length)
        .toBe(html.match(new RegExp(`</${tag}>`, "g"))?.length);
    }
  });

  it("no incluye el código en la previsualización del mensaje", () => {
    const html = renderOtpEmail({ otp: "012345" });
    const preheader = html.match(/<div aria-hidden="true"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    expect(preheader).toContain("Caduca en 5 minutos");
    expect(preheader).not.toContain("012345");
    expect(html).toContain("No compartas este código con nadie");
  });

  it("escapa HTML sin insertar etiquetas recibidas como código", () => {
    const html = renderOtpEmail({ otp: `<img src="x">&'` });
    expect(html).toContain("&lt;img src=&quot;x&quot;&gt;&amp;&#39;");
    expect(html).not.toContain("<img");
  });
});