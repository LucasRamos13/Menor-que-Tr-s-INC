/**
 * Turns technical errors (Postgres/PostgREST codes, network failures, Google
 * API errors) into short messages a non-technical user can act on. The
 * original error is always logged to the console (and can be wired to a
 * real logging service later) so nothing is silently swallowed.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const PG_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com esses dados.",
  "23503": "Não foi possível concluir porque este item está relacionado a outro registro.",
  "23514": "Alguns dados informados são inválidos.",
  "42501": "Você não tem permissão para fazer isso.",
  PGRST116: "Registro não encontrado.",
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

function isPostgrestLikeError(error: unknown): error is PostgrestLikeError {
  return typeof error === "object" && error !== null && ("code" in error || "message" in error);
}

export function toFriendlyMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (error instanceof AppError) return error.message;

  if (isPostgrestLikeError(error) && error.code && PG_MESSAGES[error.code]) {
    return PG_MESSAGES[error.code];
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  return fallback;
}

export function logAndFormat(error: unknown, context: string, fallback?: string): string {
  console.error(`[${context}]`, error);
  return toFriendlyMessage(error, fallback);
}
