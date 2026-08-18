import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { WorkspaceFormCard } from "./WorkspaceFormCard";
import { WorkspaceFormsGridLoadingGate } from "./WorkspaceFormsGridLoadingGate";

type Props = {
  workspaceId: string;
  workspaceTypeformId: string;
  forms: TypeformFormSummary[];
  canCreateForms: boolean;
};

export function WorkspaceFormsGrid({
  workspaceId,
  workspaceTypeformId,
  forms,
  canCreateForms,
}: Props) {
  return (
    <WorkspaceFormsGridLoadingGate>
      <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {forms.map((form) => (
          <WorkspaceFormCard
            key={form.id}
            workspaceId={workspaceId}
            workspaceTypeformId={workspaceTypeformId}
            form={form}
            canCreateForms={canCreateForms}
          />
        ))}
      </section>
    </WorkspaceFormsGridLoadingGate>
  );
}
