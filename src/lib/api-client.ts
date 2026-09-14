"use client";

import { getAccessToken } from "@privy-io/react-auth";

/**
 * Browser → our API. Every authenticated call goes through here so the Privy
 * access token is attached in exactly one place, and so no component is ever
 * tempted to send a profile id instead (the server resolves that from the
 * verified token; a client-supplied id would be attacker input).
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { authenticated?: boolean } = {}
): Promise<T> {
  const { authenticated = true, headers, ...rest } = init;

  const merged: Record<string, string> = {
    "content-type": "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };

  if (authenticated) {
    const token = await getAccessToken();
    if (!token) throw new ApiError("Not signed in", 401);
    merged.authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...rest, headers: merged });
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
 * multipart boundary that fetch generates. Setting `application/json` — or even
 * setting `multipart/form-data` by hand — produces a body the server cannot
 * parse. The auth header is attached the same way, from the same place.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  init: Omit<RequestInit, "body" | "headers"> = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ApiError("Not signed in", 401);

  const response = await fetch(path, {
    method: "POST",
    ...init,
    body: form,
    headers: { authorization: `Bearer ${token}` },
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
