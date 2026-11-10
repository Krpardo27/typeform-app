import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalSearchResult } from "@/features/admin/actions/search-action";
import GlobalSearchForm from "./GlobalSearchForm";

const mocks = vi.hoisted(() => ({
  cursor: 0,
  state: [] as unknown[],
  push: vi.fn(),
  pathname: "/workspaces/radio/forms",
}));

// Harness node: ejecuta los handlers reales y conserva el estado entre renders.
// Los resultados ya están cargados; no se realiza ninguna solicitud de red.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => {
    const index = mocks.cursor++;
    return [mocks.state[index], (next: unknown) => {
      mocks.state[index] = typeof next === "function" ? next(mocks.state[index]) : next;
    }];
  },
  useMemo: (compute: () => unknown) => compute(),
  useRef: () => ({ current: null }),
  useEffect: () => {},
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}));

function nodes(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node as ReactElement<Record<string, unknown>>, ...Children.toArray(node.props.children).flatMap(nodes)];
}

const form = { id: "concurso /?#ñ%", title: "Concurso", workspaceId: "radio /?#á%", workspaceName: "Radio" };
const href = `/workspaces/${encodeURIComponent(form.workspaceId)}/forms/${encodeURIComponent(form.id)}/responses`;
const result: GlobalSearchResult = {
  query: "concurso", forms: [form], workspaces: [], participants: [], authorizedUsers: [],
};
const onResults = vi.fn();

function render(mode: "admin" | "workspaces" = "workspaces") {
  mocks.cursor = 0;
  return nodes(GlobalSearchForm({ onResults, workspaceHrefMode: mode, includeForms: true }));
}

function key(key: string, mode: "admin" | "workspaces" = "workspaces") {
  const input = render(mode).find((node) => node.type === "input")!;
  const preventDefault = vi.fn();
  (input.props.onKeyDown as (event: { key: string; preventDefault: () => void }) => void)({ key, preventDefault });
  return preventDefault;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/workspaces/radio/forms";
  mocks.state = ["concurso", result, false, null, true, -1];
});

describe("GlobalSearchForm: navegación directa de formularios", () => {
  it.each(["admin", "workspaces"] as const)("el enlace en modo %s apunta a respuestas y el clic limpia el panel", (mode) => {
    const elements = render(mode);
    const link = elements.find((node) => node.props.href === href)!;
    expect(link).toBeDefined();
    expect(elements.filter((node) => typeof node.props.href === "string")).toHaveLength(1);
    (link.props.onClick as () => void)();
    expect(onResults).toHaveBeenCalledExactlyOnceWith(null);
    expect(render(mode).find((node) => node.type === "input")!.props.value).toBe("");
    expect(render(mode).some((node) => node.props.href === href)).toBe(false);
    // Link realiza la navegación nativa de Next; no se intercepta con router.push.
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each(["ArrowDown", "ArrowUp"])("%s + Enter usa el mismo destino codificado que el enlace", (arrow) => {
    expect(key(arrow)).toHaveBeenCalledOnce();
    expect(key("Enter")).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(href);
    expect(onResults).toHaveBeenCalledExactlyOnceWith(null);
    expect(render().some((node) => node.props.href === href)).toBe(false);
  });

  it("Enter sin selección activa no navega", () => {
    expect(key("Enter")).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("respeta el orden workspace → formulario al navegar con teclado", () => {
    mocks.state[1] = {
      ...result,
      workspaces: [{ id: "radio", typeformId: "remote", name: "Radio", role: "EDITOR" }],
    };
    key("ArrowDown");
    key("ArrowDown");
    key("Enter");
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(href);
  });
});