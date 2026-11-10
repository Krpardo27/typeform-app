import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OtpStep } from "./OtpStep";

const actions = vi.hoisted(() => ({ verifyOtpAction: vi.fn(), requestOtpAction: vi.fn() }));
vi.mock("../actions/login.actions", () => actions);
vi.mock("@/shared/ui/LoaderRedirect", () => ({ default: () => <p>Redirigiendo</p> }));

beforeEach(() => vi.clearAllMocks());

describe("OtpStep", () => {
  it("conserva el formulario OTP, pegado automático y opciones de verificación y reenvío", () => {
    const html = renderToStaticMarkup(<OtpStep email="alex@example.test" onBack={vi.fn()} />);
    expect(html).toContain("Revisa tu correo");
    expect(html).toContain("Verificar y entrar");
    expect(html).toContain("Reenviar código");
    expect(html).toContain("Usar otro correo");
    expect(html).toContain('type="submit"');
    expect(html).toMatch(/autoComplete="one-time-code"/i);
    expect(html).toMatch(/inputMode="numeric"/i);
    expect(html).toMatch(/maxLength="6"/i);
    expect(html).toContain("Es válido durante 5 minutos");
    expect(actions.requestOtpAction).not.toHaveBeenCalled();
    expect(actions.verifyOtpAction).not.toHaveBeenCalled();
  });

  it("mantiene el correo enmascarado y los estados accesibles", () => {
    const html = renderToStaticMarkup(<OtpStep email="alex@example.test" onBack={vi.fn()} />);
    expect(html).toContain("ale•••@example.test");
    expect(html).not.toContain("alex@example.test");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="status"');
    expect(html).toContain("motion-reduce:transition-none");
  });
});