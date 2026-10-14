import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenType = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/profil";

  const response = NextResponse.redirect(new URL(safeNext, requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Supabase peut livrer soit un code PKCE, soit un token_hash selon le
  // modèle d'e-mail configuré. Accepter les deux évite de rejeter les liens
  // token_hash comme « invalides ou expirés ».
  let error: { message: string } | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && (tokenType === "signup" || tokenType === "email")) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tokenType,
    });
    error = result.error;
  } else {
    error = { message: "Missing or unsupported confirmation token" };
  }

  if (error) {
    return NextResponse.redirect(
      new URL("/auth?error=confirmation", requestUrl.origin),
    );
  }

  return response;
}
