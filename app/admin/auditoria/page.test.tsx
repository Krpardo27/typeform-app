import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: vi.fn(async () => ({ id: "admin", globalRole: "SUPER_ADMIN" })) }));

const mocks = vi.hoisted(() => ({ auditLogs: vi.fn(), sessions: vi.fn(), timeline: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  auditLog: { findMany: mocks.auditLogs }, session: { findMany: mocks.sessions },
} }));
vi.mock("@/features/admin/audit/services/audit-timeline.service", () => ({ buildAuditTimeline: mocks.timeline }));
vi.mock("@/features/admin/audit/components/AdminAuditHeader", () => ({ AdminAuditHeader: () => <h1>Auditoría</h1> }));
vi.mock("@/features/admin/audit/components/AuditStatsGrid", () => ({ AuditStatsGrid: () => <div>Estadísticas de auditoría</div> }));
vi.mock("@/features/admin/audit/components/AuditTimeline", () => ({ AuditTimeline: () => <div>Actividad del período</div> }));

import AdminAuditPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auditLogs.mockResolvedValue([]);
  mocks.sessions.mockResolvedValue([]);
  mocks.timeline.mockReturnValue([]);
});

describe("AdminAuditPage", () => {
  it("aplica el mismo rango UTC a sesiones y eventos", async () => {
    await AdminAuditPage({ searchParams: Promise.resolve({ from: "2026-11-01", to: "2026-11-04" }) });
    const options = expect.objectContaining({ where: { createdAt: {
      gte: new Date("2026-11-01T00:00:00Z"), lt: new Date("2026-11-05T00:00:00Z"),
    } } });
    expect(mocks.auditLogs).toHaveBeenCalledWith(options);
    expect(mocks.sessions).toHaveBeenCalledWith(options);
  });

  it.each([
    { from: "2026-11-05", to: "2026-11-04" },
    { from: "2026-02-31" },
    { from: ["2026-11-01", "2026-11-04"] },
  ])("no consulta ni presenta datos como si fueran válidos con filtros incorrectos: %j", async (searchParams) => {
    const html = renderToStaticMarkup(await AdminAuditPage({ searchParams: Promise.resolve(searchParams) }));
    expect(mocks.auditLogs).not.toHaveBeenCalled();
    expect(mocks.sessions).not.toHaveBeenCalled();
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Estadísticas de auditoría");
    expect(html).not.toContain("Actividad del período");
  });

  it("permite volver a la consulta sin fechas al limpiar", async () => {
    const html = renderToStaticMarkup(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(mocks.auditLogs).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    expect(html).toContain("Actividad del período");
    expect(html).not.toContain('role="alert"');
  });
});