import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "./users/page";
import AdminUserPage from "./users/[userId]/page";
import AdminMembersPage from "./miembros/page";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(), catalog: vi.fn(), users: vi.fn(), user: vi.fn(), workspaces: vi.fn(), allowedUsers: vi.fn(),
  usersList: vi.fn(), permissionsForm: vi.fn(), memberForm: vi.fn(), whitelist: vi.fn(),
}));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/features/typeform/services/typeform.service", () => ({ getAllTypeformWorkspaces: mocks.catalog }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findMany: mocks.users, findUnique: mocks.user },
  workspace: { findMany: mocks.workspaces }, allowedUser: { findMany: mocks.allowedUsers },
} }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(`REDIRECT:${href}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/features/admin/users/components/AdminUsersList", () => ({ AdminUsersList: (props: unknown) => { mocks.usersList(props); return <section />; } }));
vi.mock("@/features/admin/workspaces/components/UserWorkspaceForm", () => ({ UserWorkspaceForm: (props: unknown) => { mocks.permissionsForm(props); return <form />; } }));
vi.mock("@/features/admin/members/components/AuthorizeMemberForm", () => ({ AuthorizeMemberForm: (props: unknown) => { mocks.memberForm(props); return <form />; } }));
vi.mock("@/features/admin/members/components/RecentWhitelist", () => ({ RecentWhitelist: (props: unknown) => { mocks.whitelist(props); return <section />; } }));

const live = { id: "local-live", name: "Radio disponible", typeformId: "remote-live", templateFormTypeformId: null, createdFromApp: true };
const retired = { ...live, id: "local-retired", name: "Radio retirada", typeformId: "remote-retired" };
const actor = { id: "admin", name: "Admin", email: "admin@example.test", globalRole: "SUPER_ADMIN" };
const users = [
  { ...actor, workspaces: [
    { workspaceId: live.id, role: "EDITOR", workspace: live },
    { workspaceId: retired.id, role: "EDITOR", workspace: retired },
  ] },
  { id: "other", name: "Otro usuario", email: "other@example.test", globalRole: "USER", workspaces: [
    { workspaceId: retired.id, role: "VIEWER", workspace: retired },
  ] },
];
type Where = { createdFromApp: boolean; typeformId: { in: string[] } };
type UserQuery = { where?: { email?: { in: string[] } }; include: { workspaces: { where: { workspace: Where } } } };

function matches(workspace: typeof live, where: Where) {
  return workspace.createdFromApp === where.createdFromApp && where.typeformId.in.includes(workspace.typeformId);
}
function projectUser(user: typeof users[number], query: UserQuery) {
  return { ...user, workspaces: user.workspaces.filter((assignment) => matches(assignment.workspace, query.include.workspaces.where.workspace)) };
}
const pages = [
  ["usuarios", () => AdminUsersPage()],
  ["detalle de usuario", () => AdminUserPage({ params: Promise.resolve({ userId: actor.id }) })],
  ["miembros", () => AdminMembersPage()],
] as const;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue(actor);
  mocks.catalog.mockResolvedValue([{ id: live.typeformId }]);
  mocks.workspaces.mockImplementation(async ({ where }: { where: Where }) => [live, retired].filter((workspace) => matches(workspace, where)));
  mocks.users.mockImplementation(async (query: UserQuery) => users
    .filter((user) => !query.where?.email || query.where.email.in.includes(user.email))
    .map((user) => projectUser(user, query)));
  mocks.user.mockImplementation(async (query: UserQuery & { where: { id: string } }) => {
    const user = users.find((item) => item.id === query.where.id);
    return user ? projectUser(user, query) : null;
  });
  mocks.allowedUsers.mockResolvedValue(users.map((user) => ({ id: `allowed-${user.id}`, email: user.email, createdAt: new Date("2026-11-06T00:00:00Z") })));
});

describe("disponibilidad remota en usuarios y selección de accesos", () => {
  it("usuarios conserva todas las cuentas pero no sus radios retiradas", async () => {
    renderToStaticMarkup(await AdminUsersPage());
    const props = mocks.usersList.mock.calls[0][0];
    expect(props.users).toHaveLength(2);
    expect(props.users[0].workspaces.map((item: { workspaceId: string }) => item.workspaceId)).toEqual([live.id]);
    expect(props.users[1].workspaces).toEqual([]);
    expect(props.currentUserId).toBe(actor.id);
    expect(users[0].workspaces).toHaveLength(2);
  });

  it("el editor recibe catálogo y asignaciones filtrados con el mismo criterio", async () => {
    renderToStaticMarkup(await AdminUserPage({ params: Promise.resolve({ userId: actor.id }) }));
    expect(mocks.permissionsForm).toHaveBeenCalledWith(expect.objectContaining({
      workspaces: [live], assignedWorkspaces: [{ workspaceId: live.id, role: "EDITOR" }],
    }));
    expect(users[0].workspaces).toHaveLength(2);
  });

  it("miembros filtra tanto las opciones de autorización como las radios de la tabla", async () => {
    renderToStaticMarkup(await AdminMembersPage());
    expect(mocks.memberForm).toHaveBeenCalledWith({ workspaces: [live] });
    const props = mocks.whitelist.mock.calls[0][0];
    expect(props.users).toHaveLength(2);
    expect(props.users[0].workspaces.map((item: { workspaceId: string }) => item.workspaceId)).toEqual([live.id]);
    expect(props.users[1].workspaces).toEqual([]);
    expect(props.allowedUsers).toHaveLength(2);
  });

  it("sin workspaces remotos muestra usuarios sin radios, editor vacío y aviso en miembros, sin borrar historial", async () => {
    mocks.catalog.mockResolvedValue([]);
    renderToStaticMarkup(await AdminUsersPage());
    expect(mocks.usersList.mock.calls[0][0].users.every((user: { workspaces: unknown[] }) => user.workspaces.length === 0)).toBe(true);
    renderToStaticMarkup(await AdminUserPage({ params: Promise.resolve({ userId: actor.id }) }));
    expect(mocks.permissionsForm).toHaveBeenCalledWith(expect.objectContaining({ workspaces: [], assignedWorkspaces: [] }));
    const html = renderToStaticMarkup(await AdminMembersPage());
    expect(html).toContain("No hay workspaces disponibles");
    expect(mocks.memberForm).not.toHaveBeenCalled();
    expect(users[0].workspaces).toHaveLength(2);
    expect(users[1].workspaces).toHaveLength(1);
  });

  it.each(pages)("%s: un fallo de Typeform se propaga, no se transforma en lista vacía", async (_, load) => {
    const error = new Error("Typeform API error 429");
    mocks.catalog.mockRejectedValueOnce(error);
    await expect(load()).rejects.toBe(error);
    expect(mocks.usersList).not.toHaveBeenCalled();
    expect(mocks.permissionsForm).not.toHaveBeenCalled();
    expect(mocks.memberForm).not.toHaveBeenCalled();
  });

  it.each(pages)("%s: valida la sesión antes de consultar Typeform", async (_, load) => {
    mocks.actor.mockResolvedValueOnce(null);
    await expect(load()).rejects.toThrow("REDIRECT:/auth/login");
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.workspaces).not.toHaveBeenCalled();
  });

  it.each(pages)("%s: no permite acceso no administrativo ni consulta el proveedor", async (_, load) => {
    mocks.actor.mockResolvedValueOnce({ ...actor, globalRole: "USER" });
    await expect(load()).rejects.toThrow("NOT_FOUND");
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
});