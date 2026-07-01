export default function WorkspacesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <section className="h-full overflow-hidden">{children}</section>;
}