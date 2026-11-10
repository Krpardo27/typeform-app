"use client";

import { LuFilePlus2, LuLoaderCircle } from "react-icons/lu";
import { duplicateFormAction, recoverDuplicatedFormAction } from "@/features/typeform/actions/duplicate-form.action";
import { getSuggestedDuplicateTitle } from "@/features/typeform/utils/duplicate-title";
import DuplicateFormDialog from "./DuplicateFormDialog";
import { useFormDuplication } from "./useFormDuplication";

type WorkspaceFormDuplicateButtonProps = {
  workspaceId: string;
  formId: string;
  formTitle: string;
  label?: string;
};

export function WorkspaceFormDuplicateButton({
  workspaceId,
  formId,
  formTitle,
  label,
}: WorkspaceFormDuplicateButtonProps) {
  const { duplicate, isPending, dialogProps } = useFormDuplication({
    suggestedTitle: getSuggestedDuplicateTitle(formTitle),
    redirectTo: `/workspaces/${encodeURIComponent(workspaceId)}/forms`,
    recoveryKey: `duplicate-recovery:${workspaceId}:${formId}`,
    create: (title, allowSameTitle) => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("_skipRedirect", "1");
      if (allowSameTitle) formData.set("_allowSameTitle", "1");
      return duplicateFormAction(workspaceId, formId, formData);
    },
    recover: (createdFormId) => recoverDuplicatedFormAction(workspaceId, formId, createdFormId),
  });

  return (
    <>
    <button
      type="button"
      onClick={() => void duplicate()}
      disabled={isPending}
      title={label ?? "Duplicar formulario"}
      aria-label={label ? `${label}: ${formTitle}` : `Duplicar ${formTitle}`}
      aria-haspopup="dialog"
      className={`
        cursor-pointer
        flex min-h-11 shrink-0 items-center justify-center gap-2
        ${label ? "w-full px-3 py-2 text-sm font-medium" : "size-11"}
        rounded-md
        border border-[#FF5C35]/35
        bg-white
        text-[#A53318]
        transition-colors
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-[#FF5C35]
        motion-reduce:transition-none
        hover:border-[#FF5C35]/45
        hover:bg-[#FFF1EC]
        hover:text-[#A53318]
        disabled:cursor-wait
        disabled:opacity-60
      `}
    >
      {isPending ? (
        <LuLoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      ) : (
        <LuFilePlus2 aria-hidden="true" className="size-4" />
      )}
      {label && <span>{label}</span>}
    </button>
    {dialogProps && <DuplicateFormDialog {...dialogProps} />}
    </>
  );
}
