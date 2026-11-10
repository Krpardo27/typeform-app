"use client";

import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import CreateWorkspaceModal from "./forms/CreateWorkspaceModal";

export default function WorkspacesPageClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FF5C35] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] motion-reduce:transition-none"
      >
        <LuPlus aria-hidden="true" className="size-4 shrink-0" />
        Crear workspace
      </button>

      {open && <CreateWorkspaceModal onClose={() => setOpen(false)} />}
    </>
  );
}