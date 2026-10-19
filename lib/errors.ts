// Typed errors that map 1:1 onto the NDJSON error codes in docs/PLAN.md.
export type ErrorCode = "missing_config" | "rate_limited" | "timeout" | "malformed_output" | "insufficient_evidence" | "bad_input" | "upstream";

export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) { super(message); }
}
export class ConfigError extends AppError {
  constructor(public varName: string) {
    super("missing_config", `Server is missing ${varName}; live research is disabled until it is configured.`);
  }
}
export class RateLimitedError extends AppError {
  constructor(what: string) { super("rate_limited", `${what} is rate limiting requests right now. Wait a minute and try again.`); }
}
export class MalformedOutputError extends AppError {
  constructor(detail: string) { super("malformed_output", `The model returned output that failed validation twice (${detail.slice(0, 300)}). Try again; if it repeats, the provider may be too obscure to research automatically.`); }
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  return new AppError("upstream", `Unexpected upstream failure: ${msg.slice(0, 300)}`);
}
