import Image from "next/image";
import { LuRadio } from "react-icons/lu";
import { getWorkspaceRadioLogo } from "../../../../../config/radio-logos";

export type WorkspaceRadioIdentity = {
  name: string;
  typeformId: string;
  templateFormTypeformId?: string | null;
};

type WorkspaceRadioLogoProps = {
  workspace: WorkspaceRadioIdentity;
  size?: 32 | 40 | 48 | 64 | 80 | 100;
  alt?: string;
  fallback?: "name" | "none" | "icon";
};

const sizeClasses = { 32: "size-8", 40: "size-10", 48: "size-12", 64: "size-16", 80: "size-20", 100: "size-25" } as const;

export function WorkspaceRadioLogo({ workspace, size = 64, alt, fallback = "name" }: WorkspaceRadioLogoProps) {
  const logo = getWorkspaceRadioLogo({ ...workspace, templateFormTypeformId: workspace.templateFormTypeformId ?? null });

  if (!logo) {
    if (fallback === "icon") {
      return (
        <span aria-hidden="true" className={`flex ${sizeClasses[size]} shrink-0 items-center justify-center`}>
          <LuRadio className="size-4" />
        </span>
      );
    }
    return fallback === "none" ? null : (
      <span className="min-w-0 wrap-anywhere text-sm leading-5 text-[#525252]">{workspace.name}</span>
    );
  }

  return (
    <Image
      src={logo.src}
      alt={alt ?? `Logo de ${logo.name}`}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={`${sizeClasses[size]} shrink-0 rounded-sm bg-white object-contain`}
    />
  );
}