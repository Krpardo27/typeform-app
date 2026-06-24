export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Dashboard Global
        </h1>
        <p className="text-sm text-zinc-400">
          Bienvenido al panel de control general del sistema.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-400">Total Usuarios</p>
          <p className="text-3xl font-bold text-zinc-100 mt-1">1,248</p>
          
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-400">
            Workspaces Activos
          </p>
          <p className="text-3xl font-bold text-zinc-100 mt-1">84</p>
          <span className="text-xs text-zinc-500">4 creados hoy</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-400">Rendimiento API</p>
          <p className="text-3xl font-bold text-zinc-100 mt-1">99.9%</p>
          <span className="text-xs text-emerald-500 font-medium">Estable</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Actividad Reciente
        </h2>
      </div>
    </div>
  );
}
