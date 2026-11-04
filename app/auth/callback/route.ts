import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function redirectWithoutCache(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return redirectWithoutCache(new URL("/login?error=configuration", url));
  }
  if (!code) {
    return redirectWithoutCache(new URL("/login?error=oauth", url));
  }

  const supabase = await createClient();
  const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !user) {
    return redirectWithoutCache(new URL("/login?error=oauth", url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approved")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return redirectWithoutCache(new URL("/login?error=approval-check", url));
  }

  return redirectWithoutCache(new URL(profile.approved ? "/" : "/pending", url));
}
