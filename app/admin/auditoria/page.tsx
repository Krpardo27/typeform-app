import { prisma } from "@/lib/prisma";
import {
  LuClock3,
  LuFilePlus2,
  LuKeyRound,
  LuLogIn,
  LuShieldCheck,
  LuTrophy,
} from "react-icons/lu";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    OTP_REQUESTED: "Codigo solicitado",
    FORM_CLONED: "Formulario clonado",
    SENSITIVE_DATA_VIEWED: "Datos sensibles vistos",
    WINNER_SELECTED: "Ganadores seleccionados",
  };

  return labels[action] ?? action;
}

function getActionIcon(action: string) {
  if (action === "OTP_REQUESTED") return LuKeyRound;
  if (action === "FORM_CLONED") return LuFilePlus2;
  if (action === "SENSITIVE_DATA_VIEWED") return LuShieldCheck;
  if (action === "WINNER_SELECTED") return LuTrophy;
  return LuClock3;
}

export default async function AdminAuditPage() {
  const [auditLogs, sessions] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const timeline = [
    ...auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      title: formatAction(log.action),
      actor: log.actorName ?? log.actorEmail ?? "Sistema",
      detail:
        log.formTitle ??
        log.workspaceName ??
        log.targetId ??
        "Evento administrativo",
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      source: "audit",
    })),
    ...sessions.map((session) => ({
      id: session.id,
      action: "LOGIN_SESSION_CREATED",
      title: "Inicio de sesion",
      actor: session.user.name ?? session.user.email,
      detail: session.user.email,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      source: "session",
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Administración
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white">Auditoria</h1>

          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Trazabilidad de sesiones, codigos de acceso, clonado de formularios
            y visualizacion de datos sensibles.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Eventos
          </p>
          <p className="mt-3 text-2xl font-bold text-white">{timeline.length}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Inicios de sesion
          </p>
          <p className="mt-3 text-2xl font-bold text-white">{sessions.length}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Eventos auditados
          </p>
          <p className="mt-3 text-2xl font-bold text-white">{auditLogs.length}</p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            IP registrada
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {timeline.filter((event) => event.ipAddress).length}
          </p>
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#111113]">
        <div className="grid grid-cols-[160px_1.1fr_1fr_160px_220px] gap-4 border-b border-zinc-800 px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>Evento</span>
          <span>Actor</span>
          <span>Detalle</span>
          <span>IP</span>
          <span>Fecha</span>
        </div>

        {timeline.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            Todavia no hay eventos de auditoria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {timeline.map((event) => {
              const Icon =
                event.action === "LOGIN_SESSION_CREATED"
                  ? LuLogIn
                  : getActionIcon(event.action);

              return (
                <div
                  key={`${event.source}-${event.id}`}
                  className="grid grid-cols-[160px_1.1fr_1fr_160px_220px] items-center gap-4 px-5 py-4 text-sm text-zinc-400 transition hover:bg-zinc-900/40"
                >
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Icon className="size-4 text-[#C8A96E]" />
                    <span className="truncate">{event.title}</span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {event.actor}
                    </p>
                    {event.userAgent && (
                      <p className="mt-1 truncate text-xs text-zinc-600">
                        {event.userAgent}
                      </p>
                    )}
                  </div>

                  <p className="truncate">{event.detail}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {event.ipAddress ?? "Sin IP"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}