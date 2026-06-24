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
        className="flex items-center gap-2 rounded-lg bg-[#C8A96E] px-3 py-2 text-sm font-medium text-black transition hover:bg-[#d4b87a]"
      >
        <LuPlus className="size-4" />
        Crear workspace
      </button>

      {open && <CreateWorkspaceModal onClose={() => setOpen(false)} />}
    </>
  );
}