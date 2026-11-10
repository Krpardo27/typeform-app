import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUserRow } from "./AdminUserRow";
import { AdminUsersList } from "./AdminUsersList";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

const { deletionProps } = vi.hoisted(() => ({ deletionProps: vi.fn() }));
vi.mock("./DeleteUserButton", () => ({
  DeleteUserButton: (props: { userId: string; userName: string; disabled?: boolean }) => {
    deletionProps(props);
    return <button type="button" disabled={props.disabled}>Eliminar</button>;
  },
}));

const user = {
  id: "user-1", name: "  Ana Pérez  ", email: "ana@example.test", globalRole: "USER",
  workspaces: [{ role: "EDITOR", workspace: { id: "radio-a", name: "Radio A", typeformId: "remote-a" } }],
};

function renderRow(overrides: Partial<ComponentProps<typeof AdminUserRow>["user"]> = {}, isSelf = false) {
  return renderToStaticMarkup(<table><tbody><AdminUserRow user={{ ...user, ...overrides }} isSelf={isSelf} /></tbody></table>);
}

beforeEach(() => vi.clearAllMocks());

describe("AdminUserRow", () => {
  it("conserva una fila de cuatro celdas y el destino de gestión del usuario", () => {
    const html = renderRow();
    expect(html.match(/<tr\b/g)).toHaveLength(1);
    expect(html.match(/<td\b/g)).toHaveLength(4);
    expect(html).toContain(">Ana Pérez</p>");
    expect(html).toContain('href="/admin/users/user-1"');
    expect(html).toContain('aria-label="Gestionar a Ana Pérez"');
    expect(html).not.toContain('role="button"');
  });

  it.each([["SUPER_ADMIN", "Superadministrador"], ["USER", "Usuario"], ["", "Sin rol definido"]])(
    "presenta el rol %s con una etiqueta legible sin badges de éxito", (globalRole, label) => {
      const html = renderRow({ globalRole });
      expect(html).toContain(label);
      expect(html).not.toContain("#16A34A");
    },
  );

  it.each(["", "   "])("normaliza nombres vacíos y usa el correo en las acciones: %j", (name) => {
    const html = renderRow({ name });
    expect(html).toContain("Sin nombre");
    expect(html).toContain('aria-label="Gestionar a ana@example.test"');
    expect(deletionProps).toHaveBeenCalledWith(expect.objectContaining({ userName: user.email }));
  });

  it("tolera un nombre nulo", () => {
    const html = renderToStaticMarkup(<table><tbody><AdminUserRow user={{ ...user, name: null }} isSelf={false} /></tbody></table>);
    expect(html).toContain("Sin nombre");
  });

  it("identifica la cuenta propia y conserva bloqueada su eliminación", () => {
    const html = renderRow({}, true);
    expect(html).toContain("Tu cuenta");
    expect(html).toContain("disabled=\"\"");
    expect(deletionProps).toHaveBeenCalledWith({ userId: user.id, userName: "Ana Pérez", disabled: true });
  });

  it("no bloquea eliminar otras cuentas", () => {
    renderRow();
    expect(deletionProps).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
  });

  it("mantiene el estado sin asignaciones", () => {
    const html = renderRow({ workspaces: [] });
    expect(html).toContain("Sin asignar");
    expect(html).not.toContain("<details");
  });

  it("sustituye el nombre visible de una radio por su logo sin alterar las cuatro celdas", () => {
    const radio = radioWorkspaceTemplates[0];
    const html = renderRow({ workspaces: [{ role: "EDITOR", workspace: { id: "local", ...radio } }] });
    const cell = html.match(/<td\b[^>]*>[\s\S]*?<\/td>/g)?.[2];
    expect(cell).toContain(`alt="${radio.name}"`);
    expect(cell).toContain("concierto.png");
    expect(cell).toContain("object-contain");
    expect(cell).not.toContain(`>${radio.name}<`);
    expect(html.match(/<td\b/g)).toHaveLength(4);
  });

  it("usa la plantilla para una asignación de radio renombrada", () => {
    const html = renderRow({ workspaces: [{ role: "VIEWER", workspace: {
      id: "clonado", name: "Promociones", typeformId: "nuevo-id", templateFormTypeformId: radioWorkspaceTemplates[1].templateFormTypeformId,
    } }] });
    expect(html).toContain("los40.png");
    expect(html).toContain('alt="Promociones"');
    expect(html).toContain("Lector");
  });

  it("muestra resumen de tres en móvil y todos los logos en la lista de escritorio", () => {
    const workspaces = radioWorkspaceTemplates.map((radio, index) => ({
      role: "VIEWER", workspace: { id: `radio-${index}`, ...radio },
    }));
    const html = renderRow({ workspaces });
    expect(html.match(/<img\b/g)).toHaveLength(radioWorkspaceTemplates.length * 2);
    expect(html).toContain("flex-wrap items-center gap-2");
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain(`Ver las ${workspaces.length} radios`);
    expect(html).toContain("Ocultar radios");
    const lists = html.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/g)!;
    expect(lists).toHaveLength(3);
    expect(lists[0].match(/<li\b/g)).toHaveLength(3);
    expect(lists[1].match(/<li\b/g)).toHaveLength(workspaces.length - 3);
    expect(lists[2].match(/<li\b/g)).toHaveLength(workspaces.length);
    expect(html).toContain('class="space-y-1.5 lg:hidden"');
    expect(html).toContain('class="hidden lg:block"');
    expect(html).toContain("lg:w-auto");
    for (const radio of radioWorkspaceTemplates) {
      expect(html).toContain(`alt="${radio.name}"`);
    }
    expect(html).toContain("Lector");
    expect(html.match(/<td\b/g)).toHaveLength(4);
  });

  it("mantiene las 60 radios en escritorio y el desplegable móvil cerrado sin scroll interno", () => {
    const workspaces = Array.from({ length: 60 }, (_, index) => ({
      role: "EDITOR",
      workspace: { ...radioWorkspaceTemplates[index % radioWorkspaceTemplates.length], id: `radio-${index}` },
    }));
    const html = renderRow({ globalRole: "SUPER_ADMIN", workspaces });
    expect(html).toContain("60 radios");
    expect(html.match(/<li\b/g)).toHaveLength(120);
    expect(html.match(/<img\b/g)).toHaveLength(120);
    const lists = html.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/g)!;
    expect(lists[0].match(/<li\b/g)).toHaveLength(3);
    expect(lists[1].match(/<li\b/g)).toHaveLength(57);
    expect(lists[2].match(/<li\b/g)).toHaveLength(60);
    expect(html).toContain('aria-label="Radios asignadas"');
    expect(html).toContain('aria-label="Radios adicionales asignadas"');
    expect(html).not.toContain("overflow-y-auto");
    expect(html).not.toContain("max-h-");
    expect(html).not.toMatch(/<details\b[^>]*\bopen=/);
    const summary = html.match(/<summary\b[^>]*>/)![0];
    expect(summary).toContain("min-h-11");
    expect(summary).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("Ver las 60 radios");
    for (const [index, list] of lists.entries()) {
      const size = index === 2 ? 64 : 48;
      for (const image of list.match(/<img\b[^>]*>/g)!) {
        expect(image).toContain(`width="${size}"`);
        expect(image).toContain(`height="${size}"`);
        expect(image).toContain(`sizes="${size}px"`);
      }
    }
    expect(html).toContain("motion-reduce:transition-none");
  });

  it.each([1, 2, 3])("con %i radios muestra todas sin un control innecesario", (count) => {
    const workspaces = radioWorkspaceTemplates.slice(0, count).map((radio, index) => ({
      role: "VIEWER", workspace: { ...radio, id: `radio-${index}` },
    }));
    const html = renderRow({ workspaces });
    expect(html.match(/<li\b/g)).toHaveLength(count * 2);
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain("overflow-y-auto");
  });

  it("reduce el padding móvil y alinea las cuatro celdas arriba", () => {
    const cells = renderRow().match(/<td\b[^>]*>/g)!;
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      expect(cell).toContain("px-3 py-3 align-top");
      expect(cell).toContain("sm:px-5 sm:py-4");
      expect(cell).not.toContain("align-middle");
    }
    expect(renderRow()).toContain("1 radio</p>");
  });

  it("conserva nombres largos y contenido escapado sin truncar", () => {
    const longName = "UnaRadioSinEspacios".repeat(15);
    const html = renderRow({
      name: "<Ana & María>",
      workspaces: [{ role: "EDITOR", workspace: { id: "radio", name: longName, typeformId: "remote" } }],
    });
    expect(html).toContain("&lt;Ana &amp; María&gt;");
    expect(html).toContain(longName);
    expect(html).not.toContain("truncate");
    expect(html).toContain("wrap-anywhere");
    expect(html).toContain("focus-visible:outline-[#A33116]");
  });
});

describe("integración con AdminUsersList existente", () => {
  it("conserva la tabla TanStack, cuatro columnas, ordenación y paginación de diez filas", () => {
    const users = Array.from({ length: 13 }, (_, index) => ({ ...user, id: `user-${index}` }));
    const html = renderToStaticMarkup(<AdminUsersList users={users} currentUserId="user-0" />);
    const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
    expect(html).toContain("<colgroup>");
    expect(html).toContain("relative w-full max-w-full overflow-x-auto");
    expect(html.match(/<col\b/g)).toHaveLength(4);
    expect(html).toContain("Ordenar por Usuario");
    expect(body?.match(/<tr\b/g)).toHaveLength(10);
    expect(deletionProps).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-0", disabled: true }));
  });

  it("conserva el estado vacío y su colspan original", () => {
    const html = renderToStaticMarkup(<AdminUsersList users={[]} currentUserId="user-0" />);
    expect(html).toContain("No hay usuarios registrados.");
    expect(html).toContain('colSpan="4"');
  });
});