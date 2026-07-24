export default function WorkspacesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="h-dvh min-h-dvh overflow-hidden">
      {children}
    </section>
  );
}