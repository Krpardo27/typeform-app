UPDATE "workspace" AS workspace
SET "createdFromApp" = true
WHERE workspace."createdFromApp" = false
  AND workspace."accountId" <> 'local'
  AND EXISTS (
    SELECT 1
    FROM "form" AS form
    WHERE form."workspaceId" = workspace.id
  );
