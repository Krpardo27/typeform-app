import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), effects: [] as Array<() => void | (() => void)> }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => { mocks.effects.push(effect); },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));

import LoaderRedirect from "./LoaderRedirect";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.effects.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout, clearTimeout });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("LoaderRedirect", () => {
  it("inicia navegación sin la espera artificial predeterminada", () => {
    LoaderRedirect({ redirectTo: "/workspaces/me", title: "Entrando", description: "Cargando" });
    mocks.effects[0]();
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith("/workspaces/me");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("conserva una demora explícita y cancela el temporizador al desmontar", () => {
    LoaderRedirect({ redirectTo: "/workspaces/me", delayMs: 500, title: "Entrando", description: "Cargando" });
    const cleanup = mocks.effects[0]();
    vi.advanceTimersByTime(499);
    expect(mocks.replace).not.toHaveBeenCalled();
    if (typeof cleanup === "function") cleanup();
    vi.advanceTimersByTime(1);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});