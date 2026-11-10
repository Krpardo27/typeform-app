import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import {
	applyStandardSecurityHeaders,
	getCorsHeaders,
	getRequestIpFromHeaders,
	getRequestOrigin,
} from "@/lib/security/http";
import { AuthRateLimitError, enforceRateLimitKeys } from "@/lib/security/rate-limit";

const handlers = toNextJsHandler(auth);

// El rate limit interno de better-auth es en memoria; este usa la BD compartida.
async function enforceOtpEndpointLimit(request: Request) {
	const { pathname } = new URL(request.url);

	if (request.method !== "POST" || !pathname.includes("email-otp")) return null;

	const ip = getRequestIpFromHeaders(request.headers);

	try {
		await enforceRateLimitKeys([`auth-api:ip:${ip}`, `auth-api:ip-path:${ip}:${pathname}`]);
		return null;
	} catch (error) {
		if (!(error instanceof AuthRateLimitError)) throw error;

		return Response.json(
			{ message: error.message },
			{ status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
		);
	}
}

function withSecurity(
	handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
	return async (request: Request) => {
		const response = (await enforceOtpEndpointLimit(request)) ?? (await handler(request));
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