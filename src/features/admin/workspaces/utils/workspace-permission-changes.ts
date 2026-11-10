import type { WorkspaceAccessAssignment } from "../components/WorkspaceAccessSelector";

export function getWorkspaceAssignmentKey(assignments: WorkspaceAccessAssignment[]) {
  return JSON.stringify([...assignments]
    .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
    .map(({ workspaceId, role }) => [workspaceId, role]));
}

export function getWorkspacePermissionChanges(
  previous: WorkspaceAccessAssignment[],
  next: WorkspaceAccessAssignment[],
) {
  const before = new Map(previous.map((assignment) => [assignment.workspaceId, assignment.role]));
  const after = new Map(next.map((assignment) => [assignment.workspaceId, assignment.role]));
  return {
    added: next.filter((assignment) => !before.has(assignment.workspaceId)),
    changed: next.filter((assignment) => before.has(assignment.workspaceId) && before.get(assignment.workspaceId) !== assignment.role),
    removed: previous.filter((assignment) => !after.has(assignment.workspaceId)),
  };
}