import { searchGlobalAction } from "@/features/admin/actions/search-action";
import { SearchAuthError } from "@/features/admin/actions/search-auth-error";

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
    if (error instanceof SearchAuthError) {
      return Response.json({ ok: false, message: error.message }, { status: 401 });
    }

    console.error("[SEARCH_ERROR]", error instanceof Error ? error.name : "unknown");

    return Response.json(
      { ok: false, message: "No se pudo ejecutar la busqueda" },
      { status: 500 },
    );
  }
}
