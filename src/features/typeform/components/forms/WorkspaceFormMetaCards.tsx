import { CopyButton } from "@/shared/components/CopyButton";
import type { getEmbedInfo } from "@/features/typeform/utils/embed-info";

type WorkspaceFormMetaCardsProps = {
  formId: string;
  clonedFrom?: string;
  embedInfo: ReturnType<typeof getEmbedInfo>;
};

export function WorkspaceFormMetaCards({
  formId,
  clonedFrom,
  embedInfo,
}: WorkspaceFormMetaCardsProps) {
  const baseFormTypeformId = clonedFrom ?? formId;
  const isEmbedCode = embedInfo.code !== formId;

  return (
    <section className="mt-8">
      <article className="max-w-4xl rounded-xl border border-[#DADAD6] bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-[#E8E8E6] bg-[#F7F7F6] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[#000000]/45">
                {isEmbedCode ? "Iframe" : "Typeform"}
              </span>

              <p className="text-sm font-semibold text-[#111111]">
                {isEmbedCode ? embedInfo.label : "ID del formulario"}
              </p>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#000000]/55">
              {isEmbedCode
                ? "Usa este código para insertar el formulario en el sitio correspondiente."
                : "Identificador de origen usado para duplicar o referenciar este formulario."}
            </p>
          </div>

          <CopyButton
            value={isEmbedCode ? embedInfo.code : baseFormTypeformId}
            label={isEmbedCode ? "Copiar código" : "Copiar ID"}
          />
        </div>

        <div className="mt-4 rounded-lg border border-[#E8E8E6] bg-[#FBFBFA] p-3">
          <code className="block max-h-32 overflow-auto break-all font-mono text-xs leading-relaxed text-[#111111]">
            {isEmbedCode ? embedInfo.code : baseFormTypeformId}
          </code>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-[#000000]/45 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
          <span>
            Actual: <span className="font-mono text-[#000000]/65">{formId}</span>
          </span>

          {isEmbedCode && (
            <span>
              Base: <span className="font-mono text-[#000000]/65">{baseFormTypeformId}</span>
            </span>
          )}
        </div>
      </article>
    </section>
  );
}