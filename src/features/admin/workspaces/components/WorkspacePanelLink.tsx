"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuHouse } from "react-icons/lu";

type WorkspacePanelLinkProps = {
  href: string;
  focusClassName: string;
};

export function WorkspacePanelLink({ href, focusClassName }: WorkspacePanelLinkProps) {
  const pathname = usePathname();
  const isCurrentPage = pathname?.replace(/\/$/, "") === href.replace(/\/$/, "");

  return (
    <Link
      href={href}
      onNavigate={(event) => {
        if (isCurrentPage) event.preventDefault();
      }}
      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] hover:text-[#171717] motion-reduce:transition-none ${focusClassName}`}
    >
      <LuHouse aria-hidden="true" className="size-4 shrink-0 text-[#FF5C35]" />
      Panel
    </Link>
  );
}