import "server-only";
import { PrivyClient } from "@privy-io/server-auth";
import { serverEnv } from "./env";

let cached: PrivyClient | null = null;

export function privyClient(): PrivyClient {
  if (cached) return cached;
  cached = new PrivyClient(serverEnv.privyAppId, serverEnv.privyAppSecret);
  return cached;
}

/**
 * Verify a Privy access token and return the caller's DID.
 *
 * Returns null rather than throwing, so route handlers can answer 401 without
 * a try/catch around every call. A malformed, expired, or forged token all
 * land here identically — we never distinguish, because telling an attacker
 * which of those it was is free information.
 */
export async function verifiedDid(token: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    // Passing the verification key verifies the signature locally. Omitting it
    // makes the SDK fetch the key from Privy on every call — correct, but it
    // adds a network hop to every authenticated request and couples our login
    // path to Privy's uptime. Set PRIVY_VERIFICATION_KEY to avoid that.
    const claims = await privyClient().verifyAuthToken(
      token,
      serverEnv.privyVerificationKey
    );
    return claims.userId;
  } catch {
    return null;
  }
}

/**
 * Pull the access token off a request. Privy puts it in the Authorization
 * header under local-storage sessions and in the `privy-token` cookie under
 * cookie sessions; accept either so the client can switch without a server
 * change.
 */
export function accessTokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);

  const cookie = request.headers.get("cookie");
  const match = cookie?.match(/(?:^|;\s*)privy-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
