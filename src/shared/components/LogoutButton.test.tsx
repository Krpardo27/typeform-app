import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/shared/ui/LoaderRedirect", () => ({ default: () => null }));

describe("LogoutButton en navegación móvil", () => {
  it.each(["dock", "workspace-dock"] as const)("mantiene foco y tamaño táctil en %s sin cerrar la sesión al renderizar", (variant) => {
    const html = renderToStaticMarkup(<LogoutButton variant={variant} />);
    expect(html).toContain('aria-label="Cerrar sesión"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("min-h-16");
    expect(html).toMatch(/class="[^"]*\bh-full\b/);
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain(">Salir</span>");
    if (variant === "dock") {
      expect(html).toContain("text-[10px] min-[390px]:text-xs");
      expect(html).not.toContain('class="max-w-full text-center text-sm"');
    }
    expect(html).not.toContain("disabled=\"\"");
  });
});