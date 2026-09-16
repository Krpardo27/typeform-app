export default function WorkspacesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="min-h-dvh overflow-x-hidden bg-[#F7F7F8] text-zinc-900">
      {children}
    </section>
  );
}