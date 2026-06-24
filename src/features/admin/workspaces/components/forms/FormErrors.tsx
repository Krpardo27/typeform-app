export default function FormErrors({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      className="
        flex items-start gap-2
        rounded-md border border-red-200
        bg-red-50 px-3 py-2 my-2
        text-sm text-red-600
      "
    >
      <span className="mt-[2px]">⚠️</span>
      <span>{children}</span>
    </p>
  );
}