import type { ReactNode } from "react";
import { CopyButton } from "@/shared/components/CopyButton";
import { getEmbedInfo } from "@/features/typeform/utils/embed-info";

const CARD_CLASSNAME =
  "rounded-2xl border border-[#E8E8E6] bg-white p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]";

type StatCardProps = {
  label: string;
  value: ReactNode;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className={CARD_CLASSNAME}>
      <p className="text-xs font-medium uppercase tracking-wider text-[#000000]/45">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold text-[#111111]">{value}</p>
    </article>
  );
}

type EmbedCodeCardProps = {
  code: string;
  label: string;
  clonedFrom?: string;
};

function EmbedCodeCard({ code, label, clonedFrom }: EmbedCodeCardProps) {
  return (
    <article className={`${CARD_CLASSNAME} lg:row-span-2`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[#000000]/45">
        {label}
      </p>

      <div className="mt-3 rounded-xl border border-[#E8E8E6] bg-[#F7F7F6] px-3 py-2">
        <code className="block break-all text-sm leading-relaxed text-[#000000]/80">
          {code}
        </code>

        <div className="mt-3 flex justify-end">
          <CopyButton value={code} label="Copiar" />
        </div>
      </div>

      {clonedFrom && (
        <p className="mt-3 text-xs text-[#000000]/55">
          Base original:{" "}
          <span className="font-mono text-[#000000]/70">{clonedFrom}</span>
        </p>
      )}
    </article>
  );
}

type WorkspaceFormMetaCardsProps = {
  formId: string;
  workspaceTypeformId: string;
  fieldsCount: number;
  hiddenFieldsCount: number;
  clonedFrom?: string;
};

export function WorkspaceFormMetaCards({
  formId,
  workspaceTypeformId,
  fieldsCount,
  hiddenFieldsCount,
  clonedFrom,
}: WorkspaceFormMetaCardsProps) {
  const { code, label } = getEmbedInfo(formId, workspaceTypeformId, clonedFrom);

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr] lg:grid-rows-2">
      <EmbedCodeCard code={code} label={label} clonedFrom={clonedFrom} />
      <StatCard label="Campos" value={fieldsCount} />
      <StatCard label="Hidden fields" value={hiddenFieldsCount} />
    </section>
  );
}
