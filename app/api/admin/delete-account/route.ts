import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 503 });
  }

  let targetId: string;
  try {
    const body = await request.json();
    targetId = typeof body?.targetId === "string" ? body.targetId : "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!targetId) return NextResponse.json({ error: "Compte cible manquant." }, { status: 400 });

  const cookieStore = await cookies();
  const sessionClient = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });

  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Session invalide. Reconnecte-toi." }, { status: 401 });
  if (user.id === targetId) return NextResponse.json({ error: "Un administrateur ne peut pas supprimer son propre compte depuis cet outil." }, { status: 400 });

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: actorProfile, error: actorError } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (actorError) return NextResponse.json({ error: "Impossible de vérifier les droits administrateur." }, { status: 500 });
  if (!actorProfile?.is_admin) return NextResponse.json({ error: "Action réservée aux administrateurs." }, { status: 403 });

  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("id,username,is_admin")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError) return NextResponse.json({ error: "Impossible de vérifier le compte cible." }, { status: 500 });
  if (!targetProfile) return NextResponse.json({ error: "Ce compte n'existe plus." }, { status: 404 });
  if (targetProfile.is_admin) return NextResponse.json({ error: "La suppression d'un autre compte administrateur est bloquée par sécurité." }, { status: 403 });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    console.error("PRYSM permanent account deletion failed:", deleteError.message);
    return NextResponse.json({ error: "La suppression définitive a échoué. Le compte n'a pas été confirmé comme supprimé." }, { status: 500 });
  }

  return NextResponse.json({ success: true, username: targetProfile.username });
}
