import { Children, isValidElement, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SweetAlertOptions } from "sweetalert2";

const mocks = vi.hoisted(() => ({
  fire: vi.fn(), action: vi.fn(), validation: vi.fn(), isLoading: vi.fn(),
  refresh: vi.fn(), success: vi.fn(), error: vi.fn(), rethrow: vi.fn(),
}));

// El flujo asíncrono se prueba sin DOM; las pruebas SSR del componente usan
// React real y cubren por separado el marcado y los atributos del botón.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }), unstable_rethrow: mocks.rethrow }));
vi.mock("../actions/delete-user-action", () => ({ deleteUserAction: mocks.action }));
vi.mock("sweetalert2", () => ({ default: { fire: mocks.fire, showValidationMessage: mocks.validation, isLoading: mocks.isLoading } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { DeleteUserButton } from "./DeleteUserButton";

function handler(overrides: Partial<ComponentProps<typeof DeleteUserButton>> = {}) {
  const element = DeleteUserButton({ userId: "user", userName: "Ana", ...overrides });
  const button = Children.toArray(element.props.children).find((child) => isValidElement(child) && child.type === "button");
  if (!isValidElement<{ onClick: () => Promise<void> }>(button)) throw new Error("Botón no encontrado");
  return button.props.onClick;
}

function simulateConfirmation() {
  mocks.fire.mockImplementation(async (options: SweetAlertOptions) => {
    const value = await options.preConfirm?.(undefined);
    return { isConfirmed: value === true, value };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.fire.mockResolvedValue({ isConfirmed: false });
  mocks.action.mockResolvedValue({ success: true });
  mocks.isLoading.mockReturnValue(false);
});

describe("flujo de DeleteUserButton con servicios simulados", () => {
  it("no abre la confirmación cuando está deshabilitado", async () => {
    await handler({ disabled: true })();
    expect(mocks.fire).not.toHaveBeenCalled();
    expect(mocks.action).not.toHaveBeenCalled();
  });

  it("cancelar no elimina ni actualiza la lista", async () => {
    await handler()();
    expect(mocks.action).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("usa texto seguro, ortografía corregida y foco inicial en Cancelar", async () => {
    await handler({ userName: "<b>Ana</b>" })();
    const options = mocks.fire.mock.calls[0][0] as SweetAlertOptions;
    expect(options.titleText).toBe("¿Eliminar a <b>Ana</b>?");
    expect(options).not.toHaveProperty("title");
    expect(options).not.toHaveProperty("html");
    expect(options.text).toContain("Esta acción no se puede deshacer. También se eliminarán");
    expect(options.confirmButtonText).toBe("Sí, eliminar");
    expect(options.focusCancel).toBe(true);
    expect(options.returnFocus).toBe(true);
    expect(options.showLoaderOnConfirm).toBe(true);
  });

  it("bloquea abrir otra confirmación hasta cerrar la primera", async () => {
    let close!: (value: { isConfirmed: boolean }) => void;
    mocks.fire.mockReturnValueOnce(new Promise((resolve) => { close = resolve; }));
    const onClick = handler();
    const first = onClick();
    await onClick();
    await vi.waitFor(() => expect(mocks.fire).toHaveBeenCalledOnce());
    expect(mocks.fire).toHaveBeenCalledOnce();
    close({ isConfirmed: false });
    await first;
    await onClick();
    expect(mocks.fire).toHaveBeenCalledTimes(2);
  });

  it("no permite Escape ni clic fuera mientras se está eliminando", async () => {
    await handler()();
    const options = mocks.fire.mock.calls[0][0] as SweetAlertOptions;
    for (const callback of [options.allowEscapeKey, options.allowOutsideClick]) {
      if (typeof callback !== "function") throw new Error("Falta protección del modal");
      mocks.isLoading.mockReturnValue(true);
      expect(callback()).toBe(false);
      mocks.isLoading.mockReturnValue(false);
      expect(callback()).toBe(true);
    }
  });

  it("solo confirma el éxito tras una respuesta explícita del servidor", async () => {
    simulateConfirmation();
    await handler()();
    expect(mocks.action).toHaveBeenCalledExactlyOnceWith("user");
    expect(mocks.success).toHaveBeenCalledWith("Usuario eliminado", expect.objectContaining({ description: "Se revocaron los accesos de Ana." }));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.fire).toHaveBeenCalledOnce();
    expect(mocks.validation).not.toHaveBeenCalled();
  });

  it("mantiene los errores esperados dentro de la confirmación sin falso éxito", async () => {
    simulateConfirmation();
    mocks.action.mockResolvedValue({ error: "No puedes eliminar tu propia cuenta." });
    await handler()();
    expect(mocks.validation).toHaveBeenCalledWith("No puedes eliminar tu propia cuenta.");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("escapa mensajes de validación antes de pasarlos a SweetAlert", async () => {
    simulateConfirmation();
    mocks.action.mockResolvedValue({ error: "<b>No permitido</b> & prueba" });
    await handler()();
    expect(mocks.validation).toHaveBeenCalledWith("&lt;b&gt;No permitido&lt;/b&gt; &amp; prueba");
  });

  it("no trata una respuesta vacía como eliminación exitosa", async () => {
    simulateConfirmation();
    mocks.action.mockResolvedValue(undefined);
    await handler()();
    expect(mocks.validation).toHaveBeenCalledWith(expect.stringContaining("Actualiza la lista"));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("trata los errores de red sin filtrar detalles ni suponer que se eliminó", async () => {
    simulateConfirmation();
    mocks.action.mockRejectedValue(new Error("PRIVATE_CONNECTION_DETAILS"));
    await handler()();
    expect(mocks.validation).toHaveBeenCalledWith("No pudimos confirmar la eliminación. Actualiza la lista antes de volver a intentarlo.");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("recupera el bloqueo si falla la apertura del modal", async () => {
    mocks.fire.mockRejectedValueOnce(new Error("Fallo del modal"));
    const onClick = handler();
    await onClick();
    expect(mocks.error).toHaveBeenCalledWith("No se pudo completar la operación", expect.any(Object));
    await onClick();
    expect(mocks.fire).toHaveBeenCalledTimes(2);
    expect(mocks.action).not.toHaveBeenCalled();
  });
});