// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { WorkspaceAccessAssignment } from "../components/WorkspaceAccessSelector";
import {
  getWorkspaceAssignmentKey,
  getWorkspacePermissionChanges,
} from "../utils/workspace-permission-changes";

function freezeAssignments(assignments: WorkspaceAccessAssignment[]) {
  assignments.forEach((assignment) => Object.freeze(assignment));
  Object.freeze(assignments);
  return assignments;
}

describe("getWorkspaceAssignmentKey", () => {
  it("ignora el orden de las asignaciones", () => {
    const assignments: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-b", role: "EDITOR" },
      { workspaceId: "workspace-a", role: "VIEWER" },
      { workspaceId: "workspace-c", role: "VIEWER" },
    ];

    expect(getWorkspaceAssignmentKey(assignments)).toBe(
      getWorkspaceAssignmentKey([...assignments].reverse()),
    );
  });

  it("distingue cambios de rol para el mismo id", () => {
    expect(getWorkspaceAssignmentKey([{ workspaceId: "workspace-a", role: "VIEWER" }]))
      .not.toBe(getWorkspaceAssignmentKey([{ workspaceId: "workspace-a", role: "EDITOR" }]));
  });

  it("distingue cambios de id para el mismo rol", () => {
    expect(getWorkspaceAssignmentKey([{ workspaceId: "workspace-a", role: "VIEWER" }]))
      .not.toBe(getWorkspaceAssignmentKey([{ workspaceId: "workspace-b", role: "VIEWER" }]));
  });

  it("evita colisiones entre ids con dos puntos y barras y varias asignaciones", () => {
    const combinedId: WorkspaceAccessAssignment[] = [
      { workspaceId: "a:VIEWER|b", role: "EDITOR" },
    ];
    const separateIds: WorkspaceAccessAssignment[] = [
      { workspaceId: "a", role: "VIEWER" },
      { workspaceId: "b", role: "EDITOR" },
    ];

    expect(getWorkspaceAssignmentKey(combinedId)).not.toBe(
      getWorkspaceAssignmentKey(separateIds),
    );
  });

  it("distingue ids que solo difieren por los caracteres : y |", () => {
    const keys = ["a:b|c", "a|b:c", "a:b:c", "a|b|c"].map((workspaceId) =>
      getWorkspaceAssignmentKey([{ workspaceId, role: "VIEWER" }]),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("genera una clave estable para una selección vacía y distinta de una no vacía", () => {
    expect(getWorkspaceAssignmentKey([])).toBe(getWorkspaceAssignmentKey([]));
    expect(getWorkspaceAssignmentKey([])).not.toBe(
      getWorkspaceAssignmentKey([{ workspaceId: "workspace-a", role: "VIEWER" }]),
    );
  });

  it("no muta el array ni sus asignaciones al ordenar", () => {
    const assignments = freezeAssignments([
      { workspaceId: "workspace-b", role: "EDITOR" },
      { workspaceId: "workspace-a", role: "VIEWER" },
    ]);
    const snapshot = structuredClone(assignments);

    getWorkspaceAssignmentKey(assignments);

    expect(assignments).toEqual(snapshot);
  });
});

describe("getWorkspacePermissionChanges", () => {
  it("identifica las asignaciones añadidas con su rol de destino", () => {
    const next: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-b", role: "EDITOR" },
      { workspaceId: "workspace-a", role: "VIEWER" },
    ];

    expect(getWorkspacePermissionChanges([], next)).toEqual({
      added: next,
      changed: [],
      removed: [],
    });
  });

  it("identifica ambos sentidos de cambio de rol sin añadir ni eliminar ids", () => {
    const previous: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-a", role: "VIEWER" },
      { workspaceId: "workspace-b", role: "EDITOR" },
    ];
    const next: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-b", role: "VIEWER" },
      { workspaceId: "workspace-a", role: "EDITOR" },
    ];

    expect(getWorkspacePermissionChanges(previous, next)).toEqual({
      added: [],
      changed: next,
      removed: [],
    });
  });

  it("separa añadidas, cambiadas y eliminadas y excluye las intactas", () => {
    const previous: WorkspaceAccessAssignment[] = [
      { workspaceId: "removed", role: "EDITOR" },
      { workspaceId: "changed", role: "VIEWER" },
      { workspaceId: "unchanged", role: "VIEWER" },
    ];
    const next: WorkspaceAccessAssignment[] = [
      { workspaceId: "unchanged", role: "VIEWER" },
      { workspaceId: "added", role: "VIEWER" },
      { workspaceId: "changed", role: "EDITOR" },
    ];

    expect(getWorkspacePermissionChanges(previous, next)).toEqual({
      added: [{ workspaceId: "added", role: "VIEWER" }],
      changed: [{ workspaceId: "changed", role: "EDITOR" }],
      removed: [{ workspaceId: "removed", role: "EDITOR" }],
    });
  });

  it("no detecta cambios para asignaciones equivalentes en otro orden", () => {
    const previous: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-a", role: "VIEWER" },
      { workspaceId: "workspace-b", role: "EDITOR" },
    ];
    const next = previous.map((assignment) => ({ ...assignment })).reverse();

    expect(getWorkspacePermissionChanges(previous, next)).toEqual({
      added: [],
      changed: [],
      removed: [],
    });
  });

  it("devuelve categorías vacías si ambas selecciones están vacías", () => {
    expect(getWorkspacePermissionChanges([], [])).toEqual({
      added: [],
      changed: [],
      removed: [],
    });
  });

  it("elimina todas las asignaciones conservando sus roles y orden anteriores", () => {
    const previous: WorkspaceAccessAssignment[] = [
      { workspaceId: "workspace-b", role: "EDITOR" },
      { workspaceId: "workspace-a", role: "VIEWER" },
    ];

    expect(getWorkspacePermissionChanges(previous, [])).toEqual({
      added: [],
      changed: [],
      removed: previous,
    });
  });

  it("no muta ninguna selección ni sus objetos al calcular cambios", () => {
    const previous = freezeAssignments([
      { workspaceId: "removed", role: "EDITOR" },
      { workspaceId: "changed", role: "VIEWER" },
      { workspaceId: "unchanged", role: "VIEWER" },
    ]);
    const next = freezeAssignments([
      { workspaceId: "unchanged", role: "VIEWER" },
      { workspaceId: "changed", role: "EDITOR" },
      { workspaceId: "added", role: "VIEWER" },
    ]);
    const previousSnapshot = structuredClone(previous);
    const nextSnapshot = structuredClone(next);

    getWorkspacePermissionChanges(previous, next);

    expect(previous).toEqual(previousSnapshot);
    expect(next).toEqual(nextSnapshot);
  });
});