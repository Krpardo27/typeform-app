import { renderToStaticMarkup } from "react-dom/server";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminAuditHeader } from "../audit/components/AdminAuditHeader";
import { AdminMembersHeader } from "../members/components/AdminMembersHeader";

describe("AdminPageHeader", () => {
  it("presenta un único título con jerarquía contenida y un borde sólido", () => {
    const html = renderToStaticMarkup(<AdminPageHeader title="Administración de usuarios" description="Gestión de accesos a radios" />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Administración de usuarios</h1>");
    expect(html).toContain(">Administración</p>");
    expect(html).toContain("text-2xl font-semibold");
    expect(html).toContain("border-b border-[#E5E5E5]");
    expect(html).not.toContain("text-3xl");
    expect(html).not.toContain("bg-linear");
    expect(html).not.toContain("absolute");
    expect(html).not.toContain("lg:pb-8");
  });

  it("sin eyebrow, leading ni vuelta no reserva una fila decorativa vacía", () => {
    const html = renderToStaticMarkup(<AdminPageHeader title="Detalle" eyebrow="" />);
    expect(html).not.toContain("Administración");
    expect(html).not.toContain("mb-3 flex");
    expect(html).not.toContain("pt-5");
    expect(html).not.toContain("<a");
    expect(html).toContain(">Detalle</h1>");
  });

  it("mantiene la vuelta por encima del título y con prioridad frente a leading", () => {
    const html = renderToStaticMarkup(<AdminPageHeader
      title="Ana Pérez" eyebrow="" backHref="/admin/users" backLabel="Volver a usuarios"
      leading={<span>Contenido alternativo</span>}
    />);
    expect(html).toContain('href="/admin/users"');
    expect(html).toContain("Volver a usuarios</span>");
    expect(html).not.toContain("Contenido alternativo");
    expect(html.indexOf("Volver a usuarios")).toBeLessThan(html.indexOf("<h1"));
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:translate-x-0");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html.match(/<svg\b[^>]*>/)![0]).toContain('aria-hidden="true"');
  });

  it.each([{ backHref: "/admin/users" }, { backLabel: "Volver" }])("usa leading si la vuelta está incompleta: %j", (back) => {
    const html = renderToStaticMarkup(<AdminPageHeader title="Detalle" {...back} leading={<span>Mi contexto</span>} />);
    expect(html).toContain("Mi contexto");
    expect(html).not.toContain("<a");
  });

  it("conserva títulos y correos largos completos y escapados con ajuste de palabras", () => {
    const name = "NombreSinEspacios".repeat(20);
    const email = `${"correo".repeat(30)}@example.test`;
    const html = renderToStaticMarkup(<AdminPageHeader title={`${name} <Ana & Luis>`} description={email} />);
    expect(html).toContain(name);
    expect(html).toContain(email);
    expect(html).toContain("&lt;Ana &amp; Luis&gt;");
    expect(html.match(/wrap-anywhere/g)!.length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain("truncate");
  });

  it("admite contenido enriquecido sin anidar párrafos ni modificar el título", () => {
    const html = renderToStaticMarkup(<AdminPageHeader
      eyebrow=""
      title={<>Detalle de <em>Ana</em></>}
      description={<><p>Primer párrafo.</p><p>Segundo <strong>párrafo</strong>.</p></>}
    />);
    expect(html).toContain("Detalle de <em>Ana</em></h1>");
    expect(html).toContain("<p>Primer párrafo.</p><p>Segundo <strong>párrafo</strong>.</p></div>");
    expect(html.match(/<p\b/g)).toHaveLength(2);
  });

  it("apila acciones en móvil y las agrupa en escritorio sin imponerles rol de botón", () => {
    const html = renderToStaticMarkup(<AdminPageHeader
      title="Usuarios"
      actions={<><Link href="/admin/workspaces">Ver workspaces</Link><span>Superadministrador</span></>}
    />);
    expect(html).toContain("flex-col gap-4 lg:flex-row");
    expect(html).toContain("lg:shrink-0 lg:justify-end");
    expect(html).toContain("lg:max-w-[45%]");
    expect(html).toContain("*:max-w-full");
    expect(html).toContain('href="/admin/workspaces"');
    expect(html).toContain("<span>Superadministrador</span>");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('role="toolbar"');
  });

  it("conserva las variantes reales de auditoría y miembros", () => {
    const audit = renderToStaticMarkup(<AdminAuditHeader />);
    const members = renderToStaticMarkup(<AdminMembersHeader />);
    expect(audit).toContain("Auditoría</h1>");
    expect(members).toContain("Agregar miembros</h1>");
    expect(audit).toContain("border-b border-[#E5E5E5]");
    expect(members).toContain("border-b border-[#E5E5E5]");
  });
});