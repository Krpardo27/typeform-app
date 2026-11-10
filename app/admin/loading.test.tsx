import { Children, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardLoading from "./dashboard/loading";
import MembersLoading from "./miembros/loading";
import UsersLoading from "./users/loading";
import UserDetailLoading from "./users/[userId]/loading";
import WorkspacesLoading from "./workspaces/loading";
import WorkspaceDetailLoading from "./workspaces/[workspaceId]/loading";
import { AdminWorkspacesGridSkeleton } from "@/features/admin/workspaces/components/AdminWorkspacesGridSkeleton";
import { WORKSPACE_FORMS_PAGE_SIZE, WORKSPACE_PAGE_SIZES } from "@/features/admin/workspaces/utils/workspace-view";

const loadings = [
  ["dashboard", DashboardLoading, "Cargando el resumen general."],
  ["miembros", MembersLoading, "Cargando miembros y accesos a workspaces."],
  ["usuarios", UsersLoading, "Cargando usuarios y sus radios asignadas."],
  ["detalle de usuario", UserDetailLoading, "Cargando el usuario y sus permisos de acceso."],
  ["workspaces", WorkspacesLoading, "Cargando workspaces disponibles."],
  ["detalle de workspace", WorkspaceDetailLoading, "Cargando el workspace y sus formularios."],
] as const;

describe("estados de carga administrativos", () => {
  it.each(loadings)("%s: anuncia una vez y deja el esqueleto fuera del árbol accesible", (_, Loading, message) => {
    const tree = Loading();
    const children = Children.toArray(tree.props.children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
    expect(children[0].props.role).toBe("status");
    expect(children[0].props["aria-hidden"]).toBeUndefined();
    expect(children[1].props["aria-hidden"]).toBe("true");
    const html = renderToStaticMarkup(tree);
    expect(html).toContain(message);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<(?:input|button|select|a|form)\b/);
    expect(html).not.toContain("<h1");
  });

  it.each(loadings)("%s: acota el ancho y desactiva cada animación con movimiento reducido", (_, Loading) => {
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toContain('class="relative min-w-0"');
    expect(html).toContain("max-w-full");
    const animations = html.match(/class="[^"]*\banimate-pulse\b[^"]*"/g)!;
    expect(animations.length).toBeGreaterThan(0);
    for (const animation of animations) expect(animation).toContain("motion-reduce:animate-none");
    expect(html).not.toContain("bg-linear");
    expect(html).not.toContain("w-96");
  });

  it("el dashboard mantiene tres métricas y cinco eventos, sin la barra extra bajo las métricas", () => {
    const html = renderToStaticMarkup(<DashboardLoading />);
    expect(html).toContain("md:grid-cols-3");
    expect(html.match(/mt-3 h-11 w-28/g)).toHaveLength(3);
    expect(html.match(/flex flex-col gap-2 px-5 py-4/g)).toHaveLength(5);
    expect(html).not.toContain("h-5 w-full max-w-xl");
  });

  it("usuarios representa diez filas y cuatro columnas, no un buscador local inexistente", () => {
    const html = renderToStaticMarkup(<UsersLoading />);
    expect(html).toContain("min-w-180 lg:min-w-220");
    expect(html).toContain("minmax(0,1.5fr)");
    expect(html.match(/last:border-b-0/g)).toHaveLength(10);
    expect(html).not.toContain("mb-4 h-10");
  });

  it("miembros y detalle de usuario comparten selector de dos paneles con sus diferencias", () => {
    const members = renderToStaticMarkup(<MembersLoading />);
    const user = renderToStaticMarkup(<UserDetailLoading />);
    for (const html of [members, user]) {
      expect(html).toContain("xl:grid-cols-2 xl:gap-8");
      expect(html).toContain("sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3");
      expect(html.match(/min-h-28/g)).toHaveLength(6);
    }
    expect(members).toContain('class="h-12 rounded-md');
    expect(user).not.toContain('class="h-12 rounded-md');
    expect(members).toContain("min-w-160 lg:min-w-190");
    expect(user).not.toContain("min-w-160");
    expect(user).toContain("h-11 w-36");
  });

  it("workspaces reserva la cuadrícula predeterminada y el detalle usa tarjetas de formularios sin logos", () => {
    const workspaces = renderToStaticMarkup(<WorkspacesLoading />);
    const detail = renderToStaticMarkup(<WorkspaceDetailLoading />);
    expect(workspaces.match(/<article\b/g)).toHaveLength(WORKSPACE_PAGE_SIZES[0]);
    expect(detail.match(/<article\b/g)).toHaveLength(WORKSPACE_FORMS_PAGE_SIZE);
    expect(workspaces.match(/mb-3 size-20/g)).toHaveLength(WORKSPACE_PAGE_SIZES[0]);
    expect(detail).not.toContain("mb-3 size-20");
    expect(detail).toContain("size-25 shrink-0");
    expect(detail).not.toContain("sm:grid-cols-3");
    for (const html of [workspaces, detail]) {
      expect(html).toContain("sm:grid-cols-2 xl:grid-cols-4");
      expect(html).toContain("border-t border-[#E8E8E6] px-4 py-3");
    }
  });
});

describe("AdminWorkspacesGridSkeleton", () => {
  it.each([[0, 1], [-5, 1], [NaN, 4], [Infinity, 4], [500, 48], [2.9, 2]])("acota count %s a %s tarjetas", (count, expected) => {
    const html = renderToStaticMarkup(<AdminWorkspacesGridSkeleton count={count} />);
    expect(html.match(/<article\b/g)).toHaveLength(expected);
    expect(html).toContain("Cargando workspaces.");
  });

  it("permite delegar el anuncio a la ruta sin emitir estados duplicados", () => {
    const html = renderToStaticMarkup(<AdminWorkspacesGridSkeleton count={2} announce={false} variant="form" />);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("size-20");
    expect(html).toContain('aria-hidden="true"');
  });
});