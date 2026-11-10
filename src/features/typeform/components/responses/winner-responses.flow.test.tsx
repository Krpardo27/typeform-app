import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTable } from "@tanstack/react-table";
import { WorkspaceFormResponsesList } from "./WorkspaceFormResponsesList";
import { ResponseTableRow } from "./ResponseTableRow";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(), useId: () => "winner-details",
}));
vi.mock("@tanstack/react-table", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-table")>();
  return { ...actual, useTable: vi.fn(actual.useTable) };
});

const winner: MaskedTypeformResponse = {
  token: "winner", visibility: "winner", answers: [{ id: "a", question: "Premio", value: "Azul", masked: false }], hidden: [],
};
const anonymous: MaskedTypeformResponse = {
  token: "anonymous", visibility: "anonymous", answers: [{ id: "b", question: "Comentario", value: "SECRETO-NO-GANADOR", masked: false }], hidden: [],
};

type Table = {
  setGlobalFilter: (value: string) => void;
  getFilteredRowModel: () => { rows: { original: { response: MaskedTypeformResponse } }[] };
};
function render() {
  renderToStaticMarkup(<WorkspaceFormResponsesList responses={[winner, anonymous]} canExportResponses={false} />);
  return vi.mocked(useTable).mock.results.at(-1)!.value as Table;
}
function nodes(element: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(element)) return [];
  return [element as ReactElement<Record<string, unknown>>, ...Children.toArray(element.props.children).flatMap(nodes)];
}
beforeEach(() => vi.clearAllMocks());

describe("interacciones de datos de ganadores", () => {
  it("TanStack solo recibe ganadores y permite buscar sus respuestas", () => {
    const table = render();
    expect(table.getFilteredRowModel().rows).toHaveLength(1);
    table.setGlobalFilter("azul");
    expect(table.getFilteredRowModel().rows[0].original.response.token).toBe("winner");
  });

  it("los datos de no ganadores no entran al índice de búsqueda", () => {
    const table = render();
    table.setGlobalFilter("SECRETO-NO-GANADOR");
    expect(table.getFilteredRowModel().rows).toHaveLength(0);
  });

  it("las filas anónimas no tienen handler de expansión aunque se fuerce su variant", () => {
    const toggle = vi.fn();
    const elements = nodes(ResponseTableRow({ response: anonymous, participantLabel: "Participante #1", isExpanded: true, variant: "winner", onToggle: toggle }));
    expect(elements.find((element) => element.type === "tr")?.props.onClick).toBeUndefined();
    expect(elements.filter((element) => element.type === "button")).toHaveLength(0);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("el botón de una fila ganadora detiene propagación para no expandir dos veces", () => {
    const toggle = vi.fn();
    const elements = nodes(ResponseTableRow({ response: winner, participantLabel: "Ganador #1", isExpanded: false, onToggle: toggle }));
    const button = elements.find((element) => element.type === "button")!;
    const stopPropagation = vi.fn();
    (button.props.onClick as (event: { stopPropagation: () => void }) => void)({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(toggle).toHaveBeenCalledOnce();
  });
});