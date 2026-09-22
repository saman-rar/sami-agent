import { ZodError } from "zod";
import { UnauthorizedError } from "./current-user";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function noStoreJson(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(data, { ...init, headers });
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError || error instanceof HttpError) {
    return noStoreJson({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return noStoreJson(
      { error: "Invalid request.", issues: error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const status =
    message.includes("not found") ? 404 :
    message.includes("already connected") ? 409 :
    message.includes("required") || message.includes("must") || message.includes("Selected") ? 400 :
    502;
  return noStoreJson({ error: message }, { status });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError("Invalid request origin.", 403);
  }
  if (originHost !== host) {
    throw new HttpError("Cross-origin state changes are not allowed.", 403);
  }
}
