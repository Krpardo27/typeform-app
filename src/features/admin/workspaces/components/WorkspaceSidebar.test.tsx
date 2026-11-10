import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

vi.mock("@/shared/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

const user = { name: "  Ana Pérez  ", email: "ana@example.com" };
const workspaces = [
  { id: "radio-a", name: "Radio A" },
  { id: "radio-b", name: "Radio B" },
];

beforeEach(() => {
  usePathname.mockReturnValue("/workspaces/radio-b/forms");
});

function getLink(html: string, href: string, label?: string) {
  return html
    .match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>[\\s\\S]*?</a>`, "g"))
    ?.find((link) => !label || link.includes(label));
}

describe("WorkspaceSidebar", () => {
  it.each(radioWorkspaceTemplates)("muestra el logo de $name junto al nombre, sin duplicar la etiqueta accesible", (radio) => {
    const html = renderToStaticMarkup(<WorkspaceSidebar user={user} workspaces={[{ id: "local", ...radio }]} currentWorkspaceId="local" />);
    const link = getLink(html, "/workspaces/local", radio.name);
    const image = link?.match(/<img\b[^>]*>/)?.[0];
    const width = image?.match(/\bwidth="(\d+)"/)?.[1];
    expect(Number(width)).toBeGreaterThan(0);
    expect(image).toContain(`height="${width}"`);
    expect(link).toContain('alt=""');
    expect(link).toContain("object-contain");
    expect(link).toContain(`>${radio.name}</span>`);
    expect(link).toContain('aria-current="location"');
  });

  it("identifica un workspace renombrado por su plantilla sin cambiar su enlace local", () => {
    const html = renderToStaticMarkup(<WorkspaceSidebar user={user} workspaces={[{
      id: "local", name: "Promociones", typeformId: "clonado", templateFormTypeformId: radioWorkspaceTemplates[1].templateFormTypeformId,
    }]} />);
    const link = getLink(html, "/workspaces/local", "Promociones");
    expect(link).toContain("los40.png");
    expect(link).toContain(">Promociones</span>");
  });

  it("mantiene el icono genérico cuando no identifica una radio", () => {
    const html = renderToStaticMarkup(<WorkspaceSidebar user={user} workspaces={workspaces} />);
    const link = getLink(html, "/workspaces/radio-a", "Radio A");
    expect(link).not.toContain("<img");
    expect(link).toContain('aria-hidden="true"');
    expect(link).toContain("<svg");
  });

  it("enlaza Panel al primer workspace sin pasar por una redirección y marca la radio seleccionada", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={user} workspaces={workspaces} currentWorkspaceId="radio-b" />,
    );

    expect(getLink(html, "/workspaces/radio-a", "Panel")).toContain("Panel");
    expect(getLink(html, "/workspaces/radio-a", "Panel")).not.toContain("aria-current");
    expect(getLink(html, "/workspaces/radio-a", "Radio A")).not.toContain("aria-current");
    expect(getLink(html, "/workspaces/radio-b", "Radio B")).toContain('aria-current="location"');
    expect(html).not.toContain('href="/workspaces/me"');
  });

  it("lleva al superadministrador directamente al panel de administración", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={{ ...user, globalRole: "SUPER_ADMIN" }} workspaces={workspaces} currentWorkspaceId="radio-a" />,
    );
    expect(getLink(html, "/admin/workspaces", "Panel")).toContain("Panel");
    expect(html).not.toContain('href="/workspaces/me"');
  });

  it("conserva el enlace de Formularios activo para poder volver desde subpáginas", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar
        user={user}
        workspaces={workspaces}
        currentWorkspaceId="radio-a"
        currentSection="forms"
      />,
    );

    const formsLink = getLink(html, "/workspaces/radio-a/forms");
    expect(formsLink).toContain("Formularios");
    expect(formsLink).toContain('aria-current="location"');
    expect(formsLink).not.toContain("cursor-default");
  });

  it("selecciona Inicio por defecto y conserva su enlace", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={user} workspaces={workspaces} currentWorkspaceId="radio-a" />,
    );

    expect(getLink(html, "/workspaces/radio-a", "Inicio")).toContain('aria-current="location"');
    expect(getLink(html, "/workspaces/radio-a/forms")).not.toContain("aria-current");
  });

  it.each(["home", "forms"] as const)("distingue la sección activa %s y mantiene el foco visible", (section) => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={user} workspaces={workspaces} currentWorkspaceId="radio-a" currentSection={section} />,
    );
    const activeLink = getLink(
      html,
      section === "forms" ? "/workspaces/radio-a/forms" : "/workspaces/radio-a",
      section === "forms" ? "Formularios" : "Inicio",
    );
    expect(activeLink).toContain("bg-[#FFF1EB]");
    expect(activeLink).toContain('aria-current="location"');
    expect(activeLink).toContain("font-medium");
    expect(activeLink).toContain("focus-visible:outline-[#A33116]");
    expect(activeLink).toContain("min-h-10");
    expect(html).not.toContain("#7C3AED");
    expect(html).not.toContain("#6D28D9");
  });

  it("sin workspace no genera navegación local y muestra el estado vacío", () => {
    usePathname.mockReturnValue("/workspaces/me");
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={user} workspaces={[]} />,
    );

    expect(getLink(html, "/workspaces/me")).toContain("Panel");
    expect(getLink(html, "/workspaces/me")).not.toContain("aria-current");
    expect(html).toContain("No tienes radios asignadas.");
    expect(html).not.toContain('aria-label="Workspace actual"');
    expect(html).not.toContain("/workspaces/undefined");
    expect(html).toContain("Cerrar sesión");
  });

  it.each([
    [user, "Ana Pérez"],
    [{ name: "   ", email: "ana@example.com" }, "ana"],
    [{ name: null, email: "ana@example.com" }, "ana"],
    [{ email: "" }, "Usuario"],
  ])("muestra un nombre normalizado o su alternativa: %j", (sidebarUser, expected) => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={sidebarUser} workspaces={workspaces} />,
    );

    expect(html).toContain(`title="${expected}"`);
  });

  it("escapa nombres y ofrece navegación accesible por teclado", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSidebar user={user} workspaces={[{ id: "radio-a", name: '<Radio & "A">' }]} />,
    );

    expect(html).toContain("&lt;Radio &amp; &quot;A&quot;&gt;");
    expect(html).toContain('aria-label="Radios"');
    expect(html).toContain("focus-visible:outline-2");
    expect(html).toContain("overflow-y-auto overscroll-contain");
  });
});