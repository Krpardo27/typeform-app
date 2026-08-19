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
          className="rounded-xl border border-[#E5E5E5] p-5 hover:border-[#18181B]"
        >
          <h3>{workspace.name}</h3>
        </Link>
      ))}
    </div>
  );
}