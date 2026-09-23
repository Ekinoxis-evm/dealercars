"use client";

/**
 * Browser → our API.
 *
 * The session travels as Supabase's cookies, which the browser attaches to a
 * same-origin request by itself, so there is no token to add here. What this
 * still guarantees is the shape of an error, and that no component is ever
 * tempted to send a profile id: the server resolves that from the verified
 * session in `requireMember()`; a client-supplied id would be attacker input.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { authenticated?: boolean } = {}
): Promise<T> {
  // `authenticated` is accepted for call-site readability; the cookie goes
  // along either way and the server decides.
  const { authenticated: _authenticated, headers, ...rest } = init;
  void _authenticated;

  const response = await fetch(path, {
    ...rest,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...((headers as Record<string, string>) ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      body?.error ?? `Request failed (${response.status})`,
      response.status,
      body?.reasons
    );
  }
  return body as T;
}

/**
 * Browser → our API, for a multipart upload.
 *
 * Separate from `apiFetch` for one reason: `fetch` must be left to set
 * `content-type` itself on a FormData body, because the header has to carry the
 * multipart boundary that fetch generates.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  init: Omit<RequestInit, "body" | "headers"> = {}
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    ...init,
    credentials: "same-origin",
    body: form,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      body?.error ?? `Upload failed (${response.status})`,
      response.status,
      body?.reasons
    );
  }
  return body as T;
}

export class ApiError extends Error {
  status: number;
  reasons?: string[];
  constructor(message: string, status: number, reasons?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reasons = reasons;
  }
}
