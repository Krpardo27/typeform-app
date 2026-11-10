import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

const mocks = vi.hoisted(() => ({ push: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/workspaces/radio/forms",
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

const defaults = { currentPage: 5, totalPages: 10, totalItems: 95, itemsPerPage: 10 };

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

function controls(props = {}) {
  return nodes(Pagination({ ...defaults, ...props }));
}

function click(label: string, props = {}) {
  const button = controls(props).find((node) => node.props["aria-label"] === label)!;
  (button.props.onClick as () => void)();
}

beforeEach(() => {
  mocks.push.mockClear();
  mocks.query = "page=5&search=concurso&status=active";
});

describe("Pagination", () => {
  it("no muestra controles sin elementos", () => {
    expect(renderToStaticMarkup(<Pagination {...defaults} totalItems={0} />)).toBe("");
  });

  it("muestra el intervalo correcto y limita el último al total", () => {
    const html = renderToStaticMarkup(<Pagination {...defaults} currentPage={10} itemLabel="formularios" />);
    expect(html).toContain("91–95");
    expect(html).toContain("formularios");
    expect(html).toContain('aria-label="Paginación"');
  });

  it("oculta navegación en una sola página, pero mantiene el selector", () => {
    const html = renderToStaticMarkup(<Pagination {...defaults} currentPage={1} totalPages={1} totalItems={5} showPageSizeSelector />);
    expect(html).not.toContain("<nav");
    expect(html).toContain("<select");
    expect(html).toContain("1–5");
  });

  it("conserva filtros al avanzar y retroceder", () => {
    click("Ir a la página siguiente");
    expect(mocks.push).toHaveBeenLastCalledWith("/workspaces/radio/forms?page=6&search=concurso&status=active");
    click("Ir a la página anterior");
    expect(mocks.push).toHaveBeenLastCalledWith("/workspaces/radio/forms?page=4&search=concurso&status=active");
  });

  it("no navega a la página activa ni fuera de los límites", () => {
    click("Página 5, actual");
    click("Ir a la página anterior", { currentPage: 1 });
    click("Ir a la página siguiente", { currentPage: 10 });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("ofrece extremos, vecinos y elipsis sin repetir páginas", () => {
    const buttons = controls().filter((node) => node.type === "button" && node.props["aria-current"] !== undefined);
    expect(buttons).toHaveLength(1);
    const numericPages = controls().filter((node) => node.type === "button" && typeof node.props.children === "number");
    expect(numericPages.map((node) => node.props.children)).toEqual([1, 4, 5, 6, 10]);
    expect(controls().filter((node) => node.props.children === "...")).toHaveLength(2);
    expect(controls({ currentPage: 1, totalPages: 2 }).filter((node) => node.type === "button" && typeof node.props.children === "number").map((node) => node.props.children)).toEqual([1, 2]);
  });

  it("cambia el tamaño con parámetro personalizado y reinicia la página", () => {
    mocks.query += "&limit=10";
    const select = controls({ showPageSizeSelector: true, pageSizeParamName: "limit" }).find((node) => node.type === "select")!;
    (select.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "20" } });
    expect(mocks.push).toHaveBeenCalledWith("/workspaces/radio/forms?page=1&search=concurso&status=active&limit=20");
  });

  it("no navega al seleccionar el mismo tamaño", () => {
    const select = controls({ showPageSizeSelector: true }).find((node) => node.type === "select")!;
    (select.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "10" } });
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("reconoce Todos sin distinguir mayúsculas solo cuando está habilitado", () => {
    mocks.query = "pageSize=ALL";
    const props = { showPageSizeSelector: true, showAllPageSizeOption: true };
    expect(controls(props).find((node) => node.type === "select")?.props.value).toBe("all");
    expect(controls({ showPageSizeSelector: true }).find((node) => node.type === "select")?.props.value).toBe("10");
    const html = renderToStaticMarkup(<Pagination {...defaults} {...props} />);
    expect(html).toContain('value="all" selected=""');
  });

  it("ofrece Última opcional y deshabilita los extremos", () => {
    click("Ir a la última página", { showLastPageButton: true });
    expect(mocks.push).toHaveBeenCalledWith("/workspaces/radio/forms?page=10&search=concurso&status=active");
    const first = controls({ currentPage: 1 }).find((node) => node.props["aria-label"] === "Ir a la página anterior");
    const last = controls({ currentPage: 10, showLastPageButton: true }).find((node) => node.props["aria-label"] === "Ir a la última página");
    expect(first?.props.disabled).toBe(true);
    expect(last?.props.disabled).toBe(true);
  });

  it("incluye vista móvil compacta, controles táctiles y foco visible", () => {
    const html = renderToStaticMarkup(<Pagination {...defaults} showPageSizeSelector />);
    expect(html).toContain("Página <span");
    expect(html).toContain("hidden items-center gap-1 sm:flex");
    expect(html).toContain("size-11");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).not.toContain("outline-none");
  });
});