import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const adminEmails = new Set([
  "ricardobarroso.med@gmail.com",
  "ricardo-barroso@hotmail.com",
  "rica_bol@hotmail.com",
]);

function redirectWithCookies(response: NextResponse, request: NextRequest, path: string) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  }
  return redirectResponse;
}

function nextResponse(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  let supabaseResponse = nextResponse(request);
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = nextResponse(request);
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimResult, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    return redirectWithCookies(supabaseResponse, request, "/login?error=auth-check");
  }
  const claims = claimResult?.claims;
  if (!claims?.sub) {
    return redirectWithCookies(supabaseResponse, request, "/login");
  }

  const email = typeof claims.email === "string" ? claims.email.toLocaleLowerCase("en-US") : "";
  if (!adminEmails.has(email)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", claims.sub)
      .maybeSingle();

    if (profileError) {
      return redirectWithCookies(supabaseResponse, request, "/login?error=approval-check");
    }
    if (!profile?.approved) {
      return redirectWithCookies(supabaseResponse, request, "/pending");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/receita/:path*",
    "/atestado/:path*",
    "/pedido-exames/:path*",
    "/apac/:path*",
    "/atendimento-antirrabico/:path*",
  ],
};
