import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { WorkspaceFormCard } from "./WorkspaceFormCard";

type Props = {
  workspaceId: string;
  forms: TypeformFormSummary[];
};

export function WorkspaceFormsGrid({ workspaceId, forms }: Props) {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {forms.map((form) => (
        <WorkspaceFormCard key={form.id} workspaceId={workspaceId} form={form} />
      ))}
    </section>
  );
}