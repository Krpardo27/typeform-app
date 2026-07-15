import { searchGlobalAction } from "@/features/admin/actions/search-action";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();
  const workspaceId = searchParams.get("workspaceId")?.trim() || undefined;
  const includeForms = searchParams.get("includeForms") === "1";
  const formId = searchParams.get("formId")?.trim() || undefined;
  const includeParticipants = searchParams.get("includeParticipants") === "1";

  if (!query) {
    return Response.json(
      { ok: false, message: "Debes ingresar un termino de busqueda." },
      { status: 400 },
    );
  }

  try {
    const result = await searchGlobalAction(query, {
      workspaceId,
      includeForms,
      formId,
      includeParticipants,
    });

    return Response.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar la busqueda";

    const status = message.includes("iniciar sesión") ? 401 : 500;

    return Response.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
