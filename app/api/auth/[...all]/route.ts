import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import {
	applyStandardSecurityHeaders,
	getCorsHeaders,
	getRequestOrigin,
} from "@/lib/security/http";

const handlers = toNextJsHandler(auth);

function withSecurity(
	handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
	return async (request: Request) => {
		const response = await handler(request);
		const origin = getRequestOrigin(request);
		const corsHeaders = getCorsHeaders(origin);

		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}

		applyStandardSecurityHeaders(response);
		return response;
	};
}

export const GET = withSecurity(handlers.GET);
export const POST = withSecurity(handlers.POST);
export const PUT = withSecurity(handlers.PUT);
export const DELETE = withSecurity(handlers.DELETE);

export async function OPTIONS(request: Request) {
	const origin = getRequestOrigin(request);
	const corsHeaders = getCorsHeaders(origin);

	return Response.json({}, { headers: corsHeaders });
}