import { prisma } from "@/lib/prisma";

const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
const AUTH_RATE_LIMIT_WINDOW_SECONDS = 1 * 60;

type ConsumeResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type AuthRateLimitInput = {
  ip: string;
  endpoint: string;
  user: string;
  email: string;
  deviceSessionId: string;
};

type AttemptRow = {
  attempts: number;
  window_started_at: Date;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toAuthRateLimitKeys(input: AuthRateLimitInput): string[] {
  const ip = normalize(input.ip);
  const endpoint = normalize(input.endpoint);
  const user = normalize(input.user);
  const email = normalize(input.email);
  const deviceSessionId = normalize(input.deviceSessionId);

  return [
    `auth:ip:${ip}`,
    `auth:ip-endpoint:${ip}:${endpoint}`,
    `auth:ip-user:${ip}:${user}`,
    `auth:user-endpoint:${user}:${endpoint}`,
    `auth:email:${email}`,
    `auth:device-session:${deviceSessionId}`,
  ];
}

async function consumeRateLimitKey(key: string): Promise<ConsumeResult> {
  const now = new Date();
  const windowStartThreshold = new Date(
    now.getTime() - AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000,
  );

  if (Math.random() < 0.02) {
    const pruneThreshold = new Date(
      now.getTime() - AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000 * 4,
    );

    await prisma.$executeRaw`
      DELETE FROM security_rate_limit
      WHERE updated_at <= ${pruneThreshold}
    `;
  }

  const result = await prisma.$queryRaw<AttemptRow[]>`
    INSERT INTO security_rate_limit (
      key,
      attempts,
      window_started_at,
      created_at,
      updated_at
    )
    VALUES (
      ${key},
      1,
      ${now},
      ${now},
      ${now}
    )
    ON CONFLICT (key)
    DO UPDATE SET
      attempts = CASE
        WHEN security_rate_limit.window_started_at <= ${windowStartThreshold} THEN 1
        ELSE security_rate_limit.attempts + 1
      END,
      window_started_at = CASE
        WHEN security_rate_limit.window_started_at <= ${windowStartThreshold} THEN ${now}
        ELSE security_rate_limit.window_started_at
      END,
      updated_at = ${now}
    RETURNING attempts, window_started_at
  `;

  const row = result[0];

  if (!row) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.attempts <= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(
    1,
    AUTH_RATE_LIMIT_WINDOW_SECONDS -
      Math.floor((now.getTime() - row.window_started_at.getTime()) / 1000),
  );

  return { allowed: false, retryAfterSeconds };
}

export class AuthRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Demasiados intentos. Intenta nuevamente en unos minutos.");
    this.name = "AuthRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function enforceAuthRateLimit(
  input: AuthRateLimitInput,
): Promise<void> {
  const keys = toAuthRateLimitKeys(input);
  let maxRetryAfter = 0;

  for (const key of keys) {
    const result = await consumeRateLimitKey(key);
    if (!result.allowed) {
      maxRetryAfter = Math.max(maxRetryAfter, result.retryAfterSeconds);
    }
  }

  if (maxRetryAfter > 0) {
    throw new AuthRateLimitError(maxRetryAfter);
  }
}
