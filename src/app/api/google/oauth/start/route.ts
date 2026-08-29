import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";


/**
 * Kicks off the Calendar-specific OAuth flow (separate from Supabase login —
 * see src/lib/google/oauth.ts for why). `state` carries the signed-in user id
 * so the callback route can attribute the tokens without trusting anything
 * the browser sends.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/google/oauth/callback`;
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
  response.cookies.set("google_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
