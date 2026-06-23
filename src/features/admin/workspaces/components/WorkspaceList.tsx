import Link from "next/link";

type Props = {
  workspaces: {
    workspace: {
      id: string;
      name: string;
    };
  }[];
};

export function WorkspaceList({ workspaces }: Props) {
  return (
    <div className="grid gap-4">
      {workspaces.map(({ workspace }) => (
        <Link
          key={workspace.id}
          href={`/workspaces/${workspace.id}`}
          className="rounded-xl border border-zinc-800 p-5 hover:border-[#C8A96E]"
        >
          <h3>{workspace.name}</h3>
        </Link>
      ))}
    </div>
  );
}