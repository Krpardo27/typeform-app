import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  WorkspaceFormsGridLoadingGate,
  useWorkspaceFormsGridOperation,
} from "./WorkspaceFormsGridLoadingGate";

type GridOperation = ReturnType<typeof useWorkspaceFormsGridOperation>;

function OperationProbe({ capture }: { capture: (operation: GridOperation) => void }) {
  capture(useWorkspaceFormsGridOperation());
  return null;
}

describe("WorkspaceFormsGridLoadingGate (SSR)", () => {
  it("muestra los children inicialmente sin inert, ocultación ni skeleton", () => {
    const html = renderToStaticMarkup(
      <WorkspaceFormsGridLoadingGate>
        <section aria-label="Formularios">
          <button type="button">Formulario visible</button>
        </section>
      </WorkspaceFormsGridLoadingGate>,
    );

    expect(html).toContain('<section aria-label="Formularios">');
    expect(html).toContain('<button type="button">Formulario visible</button>');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toMatch(/\binert(?:[\s=>])/);
    expect(html).not.toContain('aria-hidden="true"');
    expect(html).not.toContain("opacity-0");
    expect(html).not.toContain("pointer-events-none");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("Cargando formularios");
    expect(html).not.toContain("Duplicando formulario");
    expect(html).not.toContain("animate-pulse");
  });

  it("devuelve null fuera del proveedor", () => {
    const operations: GridOperation[] = [];

    renderToStaticMarkup(<OperationProbe capture={(operation) => operations.push(operation)} />);

    expect(operations).toEqual([null]);
  });

  it("comparte la operación dentro de cada gate y aísla las instancias hermanas", () => {
    const operations: GridOperation[] = [];
    const capture = (operation: GridOperation) => { operations.push(operation); };

    renderToStaticMarkup(
      <>
        <WorkspaceFormsGridLoadingGate>
          <OperationProbe capture={capture} />
          <OperationProbe capture={capture} />
        </WorkspaceFormsGridLoadingGate>
        <WorkspaceFormsGridLoadingGate>
          <OperationProbe capture={capture} />
        </WorkspaceFormsGridLoadingGate>
        <OperationProbe capture={capture} />
      </>,
    );

    expect(operations).toHaveLength(4);
    const [first, sameGate, second, outside] = operations;
    expect(first).toMatchObject({
      busy: false,
      acquire: expect.any(Function),
      release: expect.any(Function),
      run: expect.any(Function),
    });
    expect(sameGate).toBe(first);
    expect(second).toMatchObject({ busy: false });
    expect(second).not.toBe(first);
    expect(second?.acquire).not.toBe(first?.acquire);
    expect(second?.release).not.toBe(first?.release);
    expect(second?.run).not.toBe(first?.run);
    expect(outside).toBeNull();
  });

  it("usa el proveedor más cercano y restaura el contexto exterior tras un gate anidado", () => {
    const operations: GridOperation[] = [];
    const capture = (operation: GridOperation) => { operations.push(operation); };

    renderToStaticMarkup(
      <WorkspaceFormsGridLoadingGate>
        <OperationProbe capture={capture} />
        <WorkspaceFormsGridLoadingGate>
          <OperationProbe capture={capture} />
        </WorkspaceFormsGridLoadingGate>
        <OperationProbe capture={capture} />
      </WorkspaceFormsGridLoadingGate>,
    );

    expect(operations).toHaveLength(3);
    const [outer, inner, restored] = operations;
    expect(outer).toMatchObject({ busy: false });
    expect(inner).toMatchObject({ busy: false });
    expect(inner).not.toBe(outer);
    expect(inner?.acquire).not.toBe(outer?.acquire);
    expect(restored).toBe(outer);
  });
});