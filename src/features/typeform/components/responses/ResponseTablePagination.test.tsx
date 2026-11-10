import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponseTablePagination } from "./ResponseTablePagination";

function makeTable() {
  return {
    state: { pagination: { pageIndex: 4, pageSize: 20 } },
    firstPage: vi.fn(), previousPage: vi.fn(), nextPage: vi.fn(), lastPage: vi.fn(),
    getCanPreviousPage: () => true, getCanNextPage: () => true, getCanLastPage: () => true,
    getPageCount: () => 10, getRowCount: () => 200,
    setPageIndex: vi.fn(), setPageSize: vi.fn(),
  };
}

function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}

afterEach(() => vi.unstubAllGlobals());

describe("ResponseTablePagination", () => {
  it("mantiene las opciones predeterminadas de las otras tablas", () => {
    const html = renderToStaticMarkup(<ResponseTablePagination table={makeTable()} />);
    expect(html).toContain("200 filas");
    expect(html).toContain("Página 5 de 10");
    expect(html).toContain('aria-label="Filas por página de la tabla"');
    for (const size of [5, 10, 20, 50]) expect(html).toContain(`value="${size}"`);
    expect(html).not.toContain('value="all"');
  });

  it("seleccionar Todos comunica Infinity a TanStack", () => {
    const table = makeTable();
    const select = nodes(ResponseTablePagination({ table, showAllPageSizeOption: true })).find((node) => node.type === "select")!;
    (select.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "all" } });
    expect(table.setPageSize).toHaveBeenCalledWith(Infinity);
  });

  it("ordena el selector, la navegación y el salto en filas estables en móvil", () => {
    const elements = nodes(ResponseTablePagination({ table: makeTable(), itemLabel: "participantes" }));
    const select = elements.find((node) => node.type === "select")!;
    expect(select.props.className).toContain("w-full min-w-0 max-w-full");
    expect(select.props.className).toContain("sm:w-auto");
    const grid = elements.find((node) => String(node.props.className).includes("grid-cols-4"))!;
    expect(grid.props.className).toContain("grid grid-cols-4 gap-2 sm:flex");
    const buttons = nodes(grid).filter((node) => node.type === "button");
    expect(buttons).toHaveLength(4);
    for (const button of buttons) expect(button.props.className).toContain("h-11 min-w-11");
    const form = elements.find((node) => node.type === "form")!;
    expect(form.props.className).toContain("w-full min-w-0");
    expect(form.props.className).toContain("sm:w-auto");
  });

  it("saltar de página requiere enviar el formulario, no escribir cada dígito", () => {
    const table = makeTable();
    const elements = nodes(ResponseTablePagination({ table }));
    const input = elements.find((node) => node.type === "input")!;
    expect(input.props.defaultValue).toBe(5);
    expect(input.props.onChange).toBeUndefined();
    vi.stubGlobal("FormData", class { get() { return "8"; } });
    const form = elements.find((node) => node.type === "form")!;
    const preventDefault = vi.fn();
    (form.props.onSubmit as (event: { preventDefault: () => void; currentTarget: object }) => void)({ preventDefault, currentTarget: {} });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(table.setPageIndex).toHaveBeenCalledWith(7);
  });

  it.each(["", "0", "-1", "3.5", "NaN", "200", "5"])("no navega con un salto inválido o redundante: %j", (value) => {
    const table = makeTable();
    vi.stubGlobal("FormData", class { get() { return value; } });
    const form = nodes(ResponseTablePagination({ table })).find((node) => node.type === "form")!;
    (form.props.onSubmit as (event: { preventDefault: () => void; currentTarget: object }) => void)({ preventDefault: vi.fn(), currentTarget: {} });
    expect(table.setPageIndex).not.toHaveBeenCalled();
  });

  it("los controles tienen foco visible y permanecen deshabilitados durante una navegación", () => {
    const html = renderToStaticMarkup(<ResponseTablePagination table={makeTable()} isPending />);
    const controls = [...html.matchAll(/<(?:button|input|select)\b[^>]*>/g)].map(([control]) => control);
    expect(controls).toHaveLength(7);
    for (const control of controls) {
      expect(control).toContain('disabled=""');
      expect(control).toContain("focus-visible:outline-[#A33116]");
    }
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
  });
});