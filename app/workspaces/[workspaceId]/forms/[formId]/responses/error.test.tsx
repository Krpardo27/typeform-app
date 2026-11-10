import { Children, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ResponsesError from "./error";

describe("ResponsesError", () => {
  it("el botón solicita una nueva carga al boundary de Next", () => {
    const retry = vi.fn();
    const element = ResponsesError({ error: new Error("Fallo temporal"), unstable_retry: retry });
    const button = Children.toArray(element.props.children).find(
      (child) => isValidElement(child) && child.type === "button",
    );
    expect(isValidElement(button)).toBe(true);
    if (!isValidElement<{ onClick: () => void }>(button)) throw new Error("Botón no encontrado");
    button.props.onClick();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("no filtra mensajes internos ni presenta los fallos como ausencia de participantes", () => {
    const html = renderToStaticMarkup(
      <ResponsesError error={new Error("INTERNAL_PRIVATE_DATA")} unstable_retry={vi.fn()} />,
    );
    expect(html).toContain("Reintentar carga");
    expect(html).toContain("Esto no significa");
    expect(html).not.toContain("INTERNAL_PRIVATE_DATA");
    expect(html).not.toContain("Aún no hay participantes");
  });
});