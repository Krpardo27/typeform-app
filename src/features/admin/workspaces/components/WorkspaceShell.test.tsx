import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "./WorkspaceShell";
import { WorkspaceHomeHeader } from "./WorkspaceHomeHeader";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

vi.mock("./WorkspaceSidebar", () => ({ WorkspaceSidebar: () => <aside>Barra lateral</aside> }));
vi.mock("./WorkspaceMobileDock", () => ({ WorkspaceMobileDock: () => <nav>Navegación móvil</nav> }));
vi.mock("@/features/admin/components/GlobalSearchForm", () => ({
  default: ({ workspaceHrefMode, currentWorkspaceId, includeForms }: { workspaceHrefMode: string; currentWorkspaceId?: string; includeForms: boolean }) => (
    <form aria-label="Buscar" data-mode={workspaceHrefMode} data-workspace={currentWorkspaceId} data-forms={includeForms} />
  ),
}));

function mobileIdentity(html: string) {
  return html.match(/<section aria-label="Cuenta actual"[^>]*>[\s\S]*?<\/section>/)![0];
}

describe("WorkspaceShell", () => {
  const user = { name: "Ana Pérez", email: "ana@example.test" };

  it.each(radioWorkspaceTemplates)("muestra el logo de $name junto al buscador y antes del contenido aunque se renombre el workspace", (radio) => {
    const workspace = { id: "local", name: "Promociones de verano", typeformId: "clonado", templateFormTypeformId: radio.templateFormTypeformId };
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[workspace]} currentWorkspaceId="local">
      <WorkspaceHeader title="Formularios" eyebrow={workspace.name} />
    </WorkspaceShell>);
    expect(html).toContain(`alt="Logo de ${radio.name}"`);
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain('width="100"');
    expect(html).toContain("object-contain");
    expect(html.indexOf('aria-label="Contexto del workspace"')).toBeLessThan(html.indexOf('aria-label="Buscar"'));
    expect(html.indexOf('aria-label="Buscar"')).toBeLessThan(html.indexOf(`alt="Logo de ${radio.name}"`));
    expect(html.indexOf(`alt="Logo de ${radio.name}"`)).toBeLessThan(html.indexOf(">Formularios</h1>"));
    expect(html.match(/aria-label="Cuenta actual"/g)).toHaveLength(1);
  });

  it("muestra solo la radio seleccionada, no la primera del catálogo", () => {
    const workspaces = radioWorkspaceTemplates.slice(0, 2).map((radio, index) => ({ id: `local-${index}`, ...radio }));
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={workspaces} currentWorkspaceId="local-1">
      <WorkspaceHomeHeader workspaceName="LOS40" workspaceRole="EDITOR" />
    </WorkspaceShell>);
    expect(html).toContain('alt="Logo de LOS40"');
    expect(html).not.toContain('alt="Logo de CONCIERTO"');
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Buscar"');
    expect(html).toContain('data-workspace="local-1"');
    expect(html).toContain("Gestiona los formularios");
  });

  it("comparte una fila alineada entre buscador y logo, con la cuenta móvil fuera y arriba", () => {
    const workspace = { id: "local", ...radioWorkspaceTemplates[0] };
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[workspace]} currentWorkspaceId="local">
      <WorkspaceHeader title="Formularios" />
    </WorkspaceShell>);
    const context = html.match(/<section aria-label="Contexto del workspace"[^>]*>[\s\S]*?<\/section>/)?.[0];
    expect(context).toContain("flex min-w-0 items-center justify-between");
    expect(context).toContain('aria-label="Buscar"');
    expect(context).toContain('alt="Logo de CONCIERTO"');
    expect(context).not.toContain('aria-label="Cuenta actual"');
    expect(html).toContain("ml-auto hidden w-25 max-w-full shrink-0 lg:block");
    expect(html.indexOf('aria-label="Cuenta actual"')).toBeLessThan(html.indexOf('aria-label="Contexto del workspace"'));
  });

  it("oculta el logo superior en móvil para no duplicar el del dock y deja disponible el buscador", () => {
    const workspace = { id: "local", ...radioWorkspaceTemplates[0] };
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[workspace]} currentWorkspaceId="local">
      <h1>Contenido</h1>
    </WorkspaceShell>);
    expect(html).toContain('class="ml-auto hidden w-25 max-w-full shrink-0 lg:block"');
    expect(html).toContain('aria-label="Cuenta actual"');
    expect(html).toContain('aria-label="Buscar"');
    expect(html).toContain("Navegación móvil");
  });

  it("mantiene un nombre de respaldo si la radio no tiene logo catalogado", () => {
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[{ id: "otra", name: "Radio nueva", typeformId: "desconocido" }]} currentWorkspaceId="otra">
      <WorkspaceHeader title="Formularios" />
    </WorkspaceShell>);
    expect(html).toContain("Radio nueva");
    expect(html).not.toContain("<img");
    expect(mobileIdentity(html)).toContain("ana@example.test");
    expect(mobileIdentity(html)).not.toContain("Ana Pérez");
  });

  it("no inventa una radio cuando no hay workspace seleccionado", () => {
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[{ id: "otra", ...radioWorkspaceTemplates[0] }]}>
      <h1>Contenido</h1>
    </WorkspaceShell>);
    expect(html).not.toContain("<img");
    expect(html).toContain('aria-label="Cuenta actual"');
  });

  it.each(["home", "forms"] as const)("mantiene el buscador y la identidad una sola vez en %s", (currentSection) => {
    const html = renderToStaticMarkup(<WorkspaceShell
      user={{ name: "Ana Pérez", email: "ana@example.test" }}
      workspaces={[]}
      currentSection={currentSection}
    ><h1>Contenido del workspace</h1></WorkspaceShell>);
    expect(html.match(/aria-label="Cuenta actual"/g)).toHaveLength(1);
    expect(mobileIdentity(html)).toContain('Usuario: <span class="font-semibold">ana@example.test</span>');
    expect(mobileIdentity(html)).not.toContain("Ana Pérez");
    expect(html).toContain("lg:hidden");
    expect(html.indexOf('aria-label="Cuenta actual"')).toBeLessThan(html.indexOf("Contenido del workspace"));
    expect(html).toContain("Navegación móvil");
    expect(html.match(/aria-label="Buscar"/g)).toHaveLength(1);
    expect(html).toContain('data-mode="workspaces"');
    expect(html).toContain('data-forms="false"');
  });

  it("conserva la búsqueda de formularios restringida al workspace actual", () => {
    const html = renderToStaticMarkup(<WorkspaceShell user={user} workspaces={[]} currentWorkspaceId="workspace-autorizado">
      <h1>Contenido</h1>
    </WorkspaceShell>);
    expect(html).toContain('data-mode="workspaces"');
    expect(html).toContain('data-workspace="workspace-autorizado"');
    expect(html).toContain('data-forms="true"');
  });
});