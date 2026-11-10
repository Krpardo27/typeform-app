// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";

const mocks = vi.hoisted(() => ({
  auditFindMany: vi.fn(),
  sessionFindMany: vi.fn(),
  userGroupBy: vi.fn(),
  userCount: vi.fn(),
  workspaceCount: vi.fn(),
  formCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: mocks.auditFindMany },
    session: { findMany: mocks.sessionFindMany },
    user: { groupBy: mocks.userGroupBy, count: mocks.userCount },
    workspace: { count: mocks.workspaceCount },
    form: { count: mocks.formCount },
  },
}));

import {
  getActivityContext,
  getActivityTone,
  getDashboardPeriods,
} from "../dashboard.utils";
import { getDashboardSummary } from "../services/dashboard.service";

const NOW = new Date("2026-11-02T14:35:27.123Z");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type AuditLog = Parameters<typeof buildAuditTimeline>[0][number];
type Session = Parameters<typeof buildAuditTimeline>[1][number];
type Status = "ACTIVE" | "PENDING" | "REJECTED";

function auditLog(id: string, createdAt: string): AuditLog {
  return {
    id,
    action: "FORM_CLONED",
    actorName: "Administradora",
    actorEmail: "admin@example.com",
    formTitle: "Encuesta",
    workspaceName: null,
    targetId: null,
    ipAddress: null,
    userAgent: null,
    metadata: null,
    createdAt: new Date(createdAt),
  };
}

function session(id: string, createdAt: string): Session {
  return {
    id,
    createdAt: new Date(createdAt),
    ipAddress: null,
    userAgent: null,
    user: { name: "Participante", email: "user@example.com" },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.auditFindMany.mockResolvedValue([]);
  mocks.sessionFindMany.mockResolvedValue([]);
  mocks.userGroupBy.mockResolvedValue([]);
  mocks.userCount.mockResolvedValue(0);
  mocks.workspaceCount.mockResolvedValue(0);
  mocks.formCount.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("getDashboardPeriods", () => {
  it.each([
    ["mes corriente", "2026-11-02T14:35:27.123Z", "2026-11-01T00:00:00.000Z", "2026-10-26T14:35:27.123Z"],
    ["cruce de año", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "2025-12-25T00:00:00.000Z"],
    ["día bisiesto", "2024-02-29T23:59:59.999Z", "2024-02-01T00:00:00.000Z", "2024-02-22T23:59:59.999Z"],
    ["cruce de febrero bisiesto", "2024-03-01T12:00:00.000Z", "2024-03-01T00:00:00.000Z", "2024-02-23T12:00:00.000Z"],
    ["inicio DST", "2026-03-09T00:30:00-04:00", "2026-03-01T00:00:00.000Z", "2026-03-02T04:30:00.000Z"],
    ["fin DST", "2026-11-02T00:30:00-05:00", "2026-11-01T00:00:00.000Z", "2026-10-26T05:30:00.000Z"],
    ["mes UTC distinto al local", "2026-03-31T23:30:00-03:00", "2026-04-01T00:00:00.000Z", "2026-03-25T02:30:00.000Z"],
    ["año UTC distinto al local", "2026-01-01T00:30:00+14:00", "2025-12-01T00:00:00.000Z", "2025-12-24T10:30:00.000Z"],
  ])("calcula inicio UTC y exactamente 168 horas: %s", (_name, value, month, week) => {
    vi.setSystemTime(new Date(value));
    const now = new Date();
    const originalTime = now.getTime();

    const result = getDashboardPeriods(now);

    expect(result).toEqual({
      startOfMonth: new Date(month),
      sevenDaysAgo: new Date(week),
    });
    expect(now.getTime() - result.sevenDaysAgo.getTime()).toBe(SEVEN_DAYS_MS);
    expect(now.getTime()).toBe(originalTime);
  });
});

describe("getActivityContext", () => {
  it.each([
    ["Ana", "Ana", "Ana"],
    ["  Ana Pérez \t", "\n ANA PÉREZ  ", "Ana Pérez"],
    [" USER@example.com ", " user@EXAMPLE.COM ", "USER@example.com"],
    [" Ana ", "  Encuesta mensual  ", "Ana · Encuesta mensual"],
    [" Ana ", "  \t\n ", "Ana"],
    ["  ", "\t", ""],
  ])("normaliza actor %j y detalle %j", (actor, detail, expected) => {
    expect(getActivityContext({ actor, detail })).toBe(expected);
  });
});

describe("getActivityTone", () => {
  it.each([
    { action: "FORM_CLONED", metadata: { eventType: "MEMBER_REVOKED" }, expected: "critical" },
    { action: "FORM_CLONED", metadata: { eventType: "OTP_RATE_LIMITED" }, expected: "attention" },
    { action: "SENSITIVE_DATA_VIEWED", metadata: null, expected: "attention" },
    { action: "FORM_CLONED", metadata: { eventType: "MEMBER_AUTHORIZED" }, expected: "neutral" },
    { action: "FORM_CLONED", metadata: { eventType: "UNKNOWN" }, expected: "neutral" },
    { action: "SENSITIVE_DATA_VIEWED", metadata: { eventType: "MEMBER_REVOKED" }, expected: "critical" },
  ])("devuelve $expected para $action y $metadata", ({ action, metadata, expected }) => {
    expect(getActivityTone({ action, metadata })).toBe(expected);
  });

  it.each([
    null,
    undefined,
    false,
    42,
    "MEMBER_REVOKED",
    '{"eventType":"MEMBER_REVOKED"}',
    [],
    [{ eventType: "MEMBER_REVOKED" }],
    {},
    { eventType: null },
    { eventType: 42 },
    { eventType: true },
    { eventType: ["MEMBER_REVOKED"] },
    { eventType: { value: "OTP_RATE_LIMITED" } },
  ])("tolera metadatos ausentes o mal formados: %j", (metadata) => {
    expect(getActivityTone({ action: "FORM_CLONED", metadata })).toBe("neutral");
    expect(getActivityTone({ action: "SENSITIVE_DATA_VIEWED", metadata })).toBe("attention");
  });
});

describe("getDashboardSummary", () => {
  it("agrega activos, pendientes y rechazados junto con los demás contadores", async () => {
    mocks.userGroupBy.mockResolvedValue([
      { status: "REJECTED", _count: { _all: 3 } },
      { status: "ACTIVE", _count: { _all: 11 } },
      { status: "PENDING", _count: { _all: 7 } },
    ]);
    mocks.userCount.mockResolvedValue(4);
    mocks.workspaceCount.mockResolvedValueOnce(9).mockResolvedValueOnce(2);
    mocks.formCount.mockResolvedValueOnce(18).mockResolvedValueOnce(6);

    const result = await getDashboardSummary();

    expect(result.stats).toEqual({
      totalUsers: 21,
      activeUsers: 11,
      pendingUsers: 7,
      rejectedUsers: 3,
      usersCreatedThisMonth: 4,
      totalWorkspaces: 9,
      workspacesCreatedThisMonth: 2,
      totalForms: 18,
      formsCreatedLast7Days: 6,
    });
    expect(result.updatedAt).toBe(NOW.toISOString());
  });

  it.each<Status>(["ACTIVE", "PENDING", "REJECTED"])("usa cero para los estados ausentes cuando solo existe %s", async (status) => {
    mocks.userGroupBy.mockResolvedValue([{ status, _count: { _all: 8 } }]);

    const { stats } = await getDashboardSummary();

    expect(stats).toMatchObject({
      totalUsers: 8,
      activeUsers: status === "ACTIVE" ? 8 : 0,
      pendingUsers: status === "PENDING" ? 8 : 0,
      rejectedUsers: status === "REJECTED" ? 8 : 0,
    });
  });

  it("devuelve todos los contadores en cero y actividad vacía sin registros", async () => {
    expect(await getDashboardSummary()).toEqual({
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        rejectedUsers: 0,
        usersCreatedThisMonth: 0,
        totalWorkspaces: 0,
        workspacesCreatedThisMonth: 0,
        totalForms: 0,
        formsCreatedLast7Days: 0,
      },
      timeline: [],
      updatedAt: NOW.toISOString(),
    });
  });

  it("mezcla ambas fuentes por fecha descendente, limita a cinco y conserva ids iguales", async () => {
    mocks.auditFindMany.mockResolvedValue([
      auditLog("audit-old", "2026-11-01T08:00:00Z"),
      auditLog("shared-id", "2026-11-02T14:00:00Z"),
      auditLog("audit-middle", "2026-11-02T12:00:00Z"),
    ]);
    mocks.sessionFindMany.mockResolvedValue([
      session("session-middle", "2026-11-02T11:00:00Z"),
      session("shared-id", "2026-11-02T13:00:00Z"),
      session("session-last", "2026-11-02T10:00:00Z"),
    ]);

    const { timeline } = await getDashboardSummary();

    expect(timeline).toHaveLength(5);
    expect(timeline.map(({ id, source }) => ({ id, source }))).toEqual([
      { id: "shared-id", source: "audit" },
      { id: "shared-id", source: "session" },
      { id: "audit-middle", source: "audit" },
      { id: "session-middle", source: "session" },
      { id: "session-last", source: "session" },
    ]);
    expect(timeline.map(({ createdAt }) => createdAt.toISOString())).toEqual([
      "2026-11-02T14:00:00.000Z",
      "2026-11-02T13:00:00.000Z",
      "2026-11-02T12:00:00.000Z",
      "2026-11-02T11:00:00.000Z",
      "2026-11-02T10:00:00.000Z",
    ]);
    expect(timeline[0]).toMatchObject({ action: "FORM_CLONED", actor: "Administradora", detail: "Encuesta" });
    expect(timeline[1]).toMatchObject({ action: "LOGIN_SESSION_CREATED", actor: "Participante", detail: "user@example.com" });
  });

  it("conserva eventos de ambas fuentes con el mismo id y la misma fecha", async () => {
    mocks.auditFindMany.mockResolvedValue([auditLog("shared-id", NOW.toISOString())]);
    mocks.sessionFindMany.mockResolvedValue([session("shared-id", NOW.toISOString())]);

    const { timeline } = await getDashboardSummary();

    expect(timeline).toHaveLength(2);
    expect(timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "shared-id", source: "audit", createdAt: NOW }),
      expect.objectContaining({ id: "shared-id", source: "session", createdAt: NOW }),
    ]));
  });

  it("consulta límites inclusivos, workspaces creados desde la app y selecciones sin token", async () => {
    await getDashboardSummary();

    const createdThisMonth = { gte: new Date("2026-11-01T00:00:00.000Z"), lte: NOW };
    expect(mocks.userGroupBy).toHaveBeenCalledExactlyOnceWith({ by: ["status"], _count: { _all: true } });
    expect(mocks.userCount).toHaveBeenCalledExactlyOnceWith({ where: { createdAt: createdThisMonth } });
    expect(mocks.workspaceCount).toHaveBeenCalledTimes(2);
    expect(mocks.workspaceCount).toHaveBeenNthCalledWith(1, { where: { createdFromApp: true } });
    expect(mocks.workspaceCount).toHaveBeenNthCalledWith(2, {
      where: { createdFromApp: true, createdAt: createdThisMonth },
    });
    expect(mocks.formCount).toHaveBeenCalledTimes(2);
    expect(mocks.formCount).toHaveBeenNthCalledWith(1, { where: { workspace: { createdFromApp: true } } });
    expect(mocks.formCount).toHaveBeenNthCalledWith(2, {
      where: {
        workspace: { createdFromApp: true },
        createdAt: { gte: new Date("2026-10-26T14:35:27.123Z"), lte: NOW },
      },
    });
    expect(mocks.auditFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { createdAt: { lte: NOW } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        action: true,
        actorName: true,
        actorEmail: true,
        formTitle: true,
        workspaceName: true,
        targetId: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    });
    expect(mocks.sessionFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { createdAt: { lte: NOW } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
        user: { select: { name: true, email: true } },
      },
    });
    expect(mocks.sessionFindMany.mock.calls[0][0].select).not.toHaveProperty("token");
  });

  it.each([
    ["auditFindMany", 1],
    ["sessionFindMany", 1],
    ["userGroupBy", 1],
    ["userCount", 1],
    ["workspaceCount", 1],
    ["workspaceCount", 2],
    ["formCount", 1],
    ["formCount", 2],
  ] as const)("propaga el rechazo de BD en %s, consulta %i", async (name, call) => {
    const error = new Error(`BD no disponible: ${name}/${call}`);
    if (call === 2) mocks[name].mockResolvedValueOnce(0);
    mocks[name].mockRejectedValueOnce(error);

    await expect(getDashboardSummary()).rejects.toBe(error);
  });
});