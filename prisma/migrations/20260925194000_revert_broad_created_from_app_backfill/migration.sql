UPDATE "workspace" AS workspace
SET "createdFromApp" = false
WHERE workspace."createdFromApp" = true
  AND workspace."accountId" <> 'local'
  AND EXISTS (
    SELECT 1
    FROM "form" AS form
    WHERE form."workspaceId" = workspace.id
  );
