import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ResponseExportButton } from "./ResponseExportButton";
import { downloadResponsesExport } from "@/features/typeform/utils/download-responses-export";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }>,
}));

// Mismo harness node que el panel: handlers reales y estado/refs persistentes.
// Solo se sustituye el límite de descarga; no hay red ni archivos reales.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: <T,>(initial: T) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: initial };
    return [slot.value, (next: T) => { slot.value = next; }];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.slots[hooks.cursor++] ??= { value: { current: initial } };
    return slot.value;
  },
  useEffect: (effect: () => void | (() => void), deps: readonly unknown[]) => {
    const slot = hooks.slots[hooks.cursor++] ??= {};
    if (!slot.deps || deps.some((value, index) => !Object.is(value, slot.deps![index]))) {
      slot.cleanup?.();
      slot.deps = deps;
      slot.cleanup = effect() ?? undefined;
    }
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/features/typeform/utils/download-responses-export", () => ({ downloadResponsesExport: vi.fn() }));

type Props = ComponentProps<typeof ResponseExportButton>;
const request = vi.fn<NonNullable<Props["requestWinnerFlowToken"]>>();
const baseHref = "/workspaces/radio/forms/form/responses/export?page=3&pageSize=all";

function render(overrides: Partial<Props> = {}) {
  hooks.cursor = 0;
  return ResponseExportButton({
    baseHref, scope: "winners", variant: "winners", label: "Ganadores",
    canExport: true, requestWinnerFlowToken: request, ...overrides,
  }).props;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function unmount() {
  for (const slot of hooks.slots) {
    slot.cleanup?.();
    slot.cleanup = undefined;
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  hooks.cursor = 0;
  hooks.slots = [];
  request.mockResolvedValue("saved-flow");
  vi.mocked(downloadResponsesExport).mockResolvedValue(undefined);
});
afterEach(unmount);

describe("exportación frontend protegida", () => {
  it("espera el grant guardado antes de descargar y bloquea doble clic antes del render", async () => {
    const grant = deferred<string | undefined>();
    request.mockReturnValueOnce(grant.promise);
    const button = render();
    const pending = button.onClick();
    await button.onClick();
    expect(request).toHaveBeenCalledExactlyOnceWith();
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(render()).toMatchObject({ disabled: true, "aria-disabled": true, "aria-busy": true });
    await render().onClick();
    expect(request).toHaveBeenCalledOnce();
    grant.resolve("saved-flow");
    await pending;
    expect(downloadResponsesExport).toHaveBeenCalledExactlyOnceWith(baseHref, "winners", {
      winnerFlowToken: "saved-flow", signal: expect.any(AbortSignal),
    });
    expect(render()).toMatchObject({ disabled: false, "aria-disabled": false, "aria-busy": false });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("con grant activo descarga directamente sin preparar otro permiso", async () => {
    await render({ winnerFlowToken: "active-flow" }).onClick();
    expect(request).not.toHaveBeenCalled();
    expect(downloadResponsesExport).toHaveBeenCalledExactlyOnceWith(baseHref, "winners", {
      winnerFlowToken: "active-flow", signal: expect.any(AbortSignal),
    });
  });

  it("exportar todos fuera del modal nunca solicita ni transmite un grant, aunque lo reciba", async () => {
    await render({ scope: "participants", variant: "participants", label: "Participantes", winnerFlowToken: "not-for-participants" }).onClick();
    expect(request).not.toHaveBeenCalled();
    expect(downloadResponsesExport).toHaveBeenCalledExactlyOnceWith(baseHref, "participants", {
      winnerFlowToken: undefined, signal: expect.any(AbortSignal),
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("sin grant ni callback no descarga ni habilita la exportación de ganadores", async () => {
    const button = render({ requestWinnerFlowToken: undefined });
    expect(button["aria-disabled"]).toBe(true);
    await button.onClick();
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Inicia la consulta de ganadores para exportar sus datos", expect.any(Object));
  });

  it.each([undefined, ""])("una consulta sin grant (%s) no descarga y permite reintentar", async (token) => {
    request.mockResolvedValueOnce(token);
    await render().onClick();
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(render()["aria-busy"]).toBe(false);
    await render().onClick();
    expect(request).toHaveBeenCalledTimes(2);
    expect(downloadResponsesExport).toHaveBeenCalledOnce();
  });

  it("una consulta fallida no descarga, informa del error y libera el bloqueo", async () => {
    request.mockRejectedValueOnce(new Error("Consulta denegada"));
    await render().onClick();
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("No se pudo exportar", { description: "Consulta denegada" });
    expect(render()).toMatchObject({ disabled: false, "aria-busy": false });
    await render().onClick();
    expect(downloadResponsesExport).toHaveBeenCalledOnce();
  });

  it.each(["participants", "winners"] as const)("sin permiso no prepara grant ni descarga %s", async (scope) => {
    await render({ scope, canExport: false, winnerFlowToken: "flow" }).onClick();
    expect(request).not.toHaveBeenCalled();
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it("bloquea reentrada durante la descarga, incluso con el handler anterior al render", async () => {
    const download = deferred<void>();
    vi.mocked(downloadResponsesExport).mockReturnValueOnce(download.promise);
    const button = render({ winnerFlowToken: "active-flow" });
    const pending = button.onClick();
    await button.onClick();
    await render({ winnerFlowToken: "active-flow" }).onClick();
    expect(downloadResponsesExport).toHaveBeenCalledOnce();
    expect(render()["aria-busy"]).toBe(true);
    download.resolve(undefined);
    await pending;
    expect(render()["aria-busy"]).toBe(false);
  });

  it("desmontar durante la consulta impide descargar con un grant tardío", async () => {
    const grant = deferred<string | undefined>();
    request.mockReturnValueOnce(grant.promise);
    const pending = render().onClick();
    unmount();
    grant.resolve("late-flow");
    await pending;
    expect(downloadResponsesExport).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("desmontar aborta la descarga en curso sin anunciar un error de cancelación", async () => {
    const download = deferred<void>();
    vi.mocked(downloadResponsesExport).mockReturnValueOnce(download.promise);
    const pending = render({ winnerFlowToken: "flow" }).onClick();
    const signal = vi.mocked(downloadResponsesExport).mock.calls[0][2]!.signal!;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    download.reject(new DOMException("Cancelado", "AbortError"));
    await pending;
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("un fallo de red libera el bloqueo y una nueva descarga usa otro AbortController", async () => {
    vi.mocked(downloadResponsesExport).mockRejectedValueOnce(new TypeError("fetch failed"));
    await render({ winnerFlowToken: "flow" }).onClick();
    expect(toast.error).toHaveBeenCalledWith("No se pudo exportar", { description: expect.stringContaining("Comprueba tu conexión") });
    expect(render().disabled).toBe(false);
    await render({ winnerFlowToken: "flow" }).onClick();
    const calls = vi.mocked(downloadResponsesExport).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][2]!.signal).not.toBe(calls[0][2]!.signal);
    expect(calls[1][2]!.signal!.aborted).toBe(false);
  });
});