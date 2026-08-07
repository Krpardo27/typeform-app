import type { ReactNode } from "react";
import { CopyButton } from "@/shared/components/CopyButton";
import { getEmbedInfo } from "@/features/typeform/utils/embed-info";

const CARD_CLASSNAME = "rounded-xl border border-zinc-800 bg-[#111113] p-5";

type StatCardProps = {
  label: string;
  value: ReactNode;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className={CARD_CLASSNAME}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
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
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <code className="block break-all text-sm leading-relaxed text-zinc-200">
          {code}
        </code>
        <div className="mt-3 flex justify-end">
          <CopyButton value={code} label="Copiar" />
        </div>
      </div>
      {clonedFrom && (
        <p className="mt-3 text-xs text-zinc-500">
          Base original:{" "}
          <span className="font-mono text-zinc-400">{clonedFrom}</span>
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
