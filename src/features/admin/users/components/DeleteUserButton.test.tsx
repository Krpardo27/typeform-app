import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DeleteUserButton } from "./DeleteUserButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions/delete-user-action", () => ({ deleteUserAction: vi.fn() }));

describe("DeleteUserButton", () => {
  it("mantiene la eliminación bloqueada para la cuenta propia y explica por qué", () => {
    const html = renderToStaticMarkup(<DeleteUserButton userId="self" userName="Ana" disabled />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('title="No puedes eliminar tu propia cuenta"');
    expect(html).toContain('aria-label="Eliminar a Ana"');
  });

  it("mantiene el control nativo, el foco accesible y los iconos decorativos", () => {
    const html = renderToStaticMarkup(<DeleteUserButton userId="other" userName="Luis" />);
    expect(html).toContain('type="button"');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("min-h-10");
    expect(html).toContain("focus-visible:outline-[#B42318]");
    expect(html).toContain("motion-reduce:transition-none");
  });
});