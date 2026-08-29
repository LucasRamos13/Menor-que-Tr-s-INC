import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, fetchGoogleAccountEmail } from "@/lib/google/oauth";
import { getMyCoupleContext } from "@/services/couples/couples-service";


export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const settingsUrl = new URL("/settings/google-calendar", origin);

  if (errorParam) {
    settingsUrl.searchParams.set("error", "access_denied");
    return NextResponse.redirect(settingsUrl);
  }

  const expectedState = request.cookies.get("google_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const couple = await getMyCoupleContext(supabase, user.id);
    if (!couple) throw new Error("Usuário ainda não pertence a um casal.");

    const redirectUri = `${origin}/api/google/oauth/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      // Happens if the user previously granted consent and Google skips issuing a
      // fresh refresh_token; forcing prompt=consent (see buildGoogleAuthUrl) avoids
      // this in the normal case, but we still guard against it defensively.
      throw new Error("O Google não retornou um refresh token. Revogue o acesso em myaccount.google.com/permissions e tente novamente.");
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabase.from("google_calendar_connections").upsert(
      {
        user_id: user.id,
        couple_id: couple.coupleId,
        google_account_email: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scope: tokens.scope,
        sync_enabled: true,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    settingsUrl.searchParams.set("connected", "1");
  } catch (error) {
    console.error("[google-oauth-callback]", error);
    settingsUrl.searchParams.set("error", "connection_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("google_oauth_state");
  return response;
}
