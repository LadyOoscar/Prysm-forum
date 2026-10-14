import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authorization) {
    return new Response(JSON.stringify({ error: "Configuration serveur ou session manquante." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let targetId = "";
  try {
    const body = await req.json();
    targetId = typeof body?.targetId === "string" ? body.targetId : "";
  } catch {
    return new Response(JSON.stringify({ error: "Requête invalide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!targetId) return new Response(JSON.stringify({ error: "Compte cible manquant." }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return new Response(JSON.stringify({ error: "Session invalide. Reconnecte-toi." }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
  if (user.id === targetId) return new Response(JSON.stringify({ error: "Tu ne peux pas supprimer ton propre compte depuis cet outil." }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });

  const { data: actorProfile, error: actorError } = await adminClient
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (actorError) return new Response(JSON.stringify({ error: "Impossible de vérifier les droits administrateur." }), {
    status: 500, headers: { "Content-Type": "application/json" },
  });
  if (!actorProfile?.is_admin) return new Response(JSON.stringify({ error: "Action réservée aux administrateurs." }), {
    status: 403, headers: { "Content-Type": "application/json" },
  });

  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles").select("id,username,is_admin").eq("id", targetId).maybeSingle();
  if (targetError) return new Response(JSON.stringify({ error: "Impossible de vérifier le compte cible." }), {
    status: 500, headers: { "Content-Type": "application/json" },
  });
  if (!targetProfile) return new Response(JSON.stringify({ error: "Ce compte n'existe plus." }), {
    status: 404, headers: { "Content-Type": "application/json" },
  });
  if (targetProfile.is_admin) return new Response(JSON.stringify({ error: "La suppression d'un autre compte administrateur est bloquée par sécurité." }), {
    status: 403, headers: { "Content-Type": "application/json" },
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    console.error("PRYSM permanent account deletion failed:", deleteError.message);
    return new Response(JSON.stringify({ error: "La suppression définitive a échoué." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, username: targetProfile.username }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
