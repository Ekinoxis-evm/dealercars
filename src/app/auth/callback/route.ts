import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { serverEnv } from "@/lib/env";

/**
 * Where the sign-in email's link lands.
 *
 * Supabase sends the member either a `code` (PKCE) or a `token_hash`,
 * depending on the email template. Both are exchanged for a session here,
 * the cookies are set on the response, and the member continues to wherever
 * they were going. `next` is kept on this origin — an open redirect on the
 * login callback is the classic phishing hand-off.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    serverEnv.supabaseUrl,
    serverEnv.supabasePublishableKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        },
      },
    }
  );

  let failed = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "magiclink" | "signup" | "recovery" | "email_change",
    });
    failed = !!error;
  } else {
    failed = true;
  }

  const target = new URL(failed ? `/?auth=failed` : next, serverEnv.siteUrl);
  return NextResponse.redirect(target);
}
