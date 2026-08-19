"use client";

import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import CreateWorkspaceModal from "./forms/CreateWorkspaceModal";

export default function WorkspacesPageClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 cursor-pointer rounded-lg bg-[#18181B] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#27272A]"
      >
        <LuPlus className="size-4" />
        Crear workspace
      </button>

      {open && <CreateWorkspaceModal onClose={() => setOpen(false)} />}
    </>
  );
}