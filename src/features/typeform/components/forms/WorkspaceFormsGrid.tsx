import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { WorkspaceFormCard } from "./WorkspaceFormCard";

type Props = {
  workspaceId: string;
  workspaceTypeformId: string;
  forms: TypeformFormSummary[];
};

export function WorkspaceFormsGrid({ workspaceId, workspaceTypeformId, forms }: Props) {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {forms.map((form) => (
        <WorkspaceFormCard
          key={form.id}
          workspaceId={workspaceId}
          workspaceTypeformId={workspaceTypeformId}
          form={form}
        />
      ))}
    </section>
  );
}