type MobileUserIdentityProps = {
  user: {
    name?: string | null;
    email: string;
  };
};

export function MobileUserIdentity({ user }: MobileUserIdentityProps) {
  const email = user.email.trim();
  const displayName = user.name?.trim() || email.split("@")[0] || "Usuario";
  const initial = Array.from(displayName)[0].toLocaleUpperCase("es");

  return (
    <section
      aria-label="Cuenta actual"
      className="flex min-w-0 items-center gap-3 py-3 lg:hidden lg:my-5 my-2"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#D1D1CD] text-sm font-semibold text-[#595954]"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        
        <p className="mt-0.5 wrap-anywhere text-md leading-5 text-[#171717]">
          Usuario: <span className="font-semibold">{email || "Correo no disponible"}</span>
        </p>
      </div>
    </section>
  );
}
