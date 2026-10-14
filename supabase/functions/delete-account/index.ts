import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey || !authorization) return json({ error: "Configuration serveur ou session manquante." }, 401);

  let targetId = "";
  try {
    const body = await req.json();
    targetId = typeof body?.targetId === "string" ? body.targetId : "";
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
  if (!targetId) return json({ error: "Compte cible manquant." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = authorization.replace(/^Bearer\\s+/i, "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Session invalide. Reconnecte-toi." }, 401);
  if (user.id === targetId) return json({ error: "Tu ne peux pas supprimer ton propre compte depuis cet outil." }, 400);

  const { data: actorProfile, error: actorError } = await adminClient.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (actorError) return json({ error: "Impossible de vérifier les droits administrateur." }, 500);
  if (!actorProfile?.is_admin) return json({ error: "Action réservée aux administrateurs." }, 403);

  const { data: targetProfile, error: targetError } = await adminClient.from("profiles").select("id,username,is_admin").eq("id", targetId).maybeSingle();
  if (targetError) return json({ error: "Impossible de vérifier le compte cible." }, 500);
  if (!targetProfile) return json({ error: "Ce compte n'existe plus." }, 404);
  if (targetProfile.is_admin) return json({ error: "La suppression d'un autre compte administrateur est bloquée par sécurité." }, 403);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
  if (deleteError) {
    // Some legacy/test accounts exist in auth.users without a GoTrue identity record.
    // The Auth Admin API reports these as "User not found"; fall back to a service-role-only DB function.
    if (/user not found/i.test(deleteError.message)) {
      const { data: deleted, error: fallbackError } = await adminClient.rpc("delete_auth_user_by_id", { target_user_id: targetId });
      if (!fallbackError && deleted === true) {
        const { error: profileCleanupError } = await adminClient.from("profiles").delete().eq("id", targetId);
        if (profileCleanupError) {
          console.error("PRYSM legacy profile cleanup failed:", profileCleanupError.message);
          return json({ error: "Le compte Auth a été supprimé, mais le profil du forum n’a pas pu être nettoyé : " + profileCleanupError.message }, 500);
        }
        return json({ success: true, username: targetProfile.username, cleanup: "database_fallback" });
      }
      console.error("PRYSM permanent account deletion fallback failed:", fallbackError?.message ?? "Target row not deleted");
      return json({ error: "L’API Auth ne reconnaît pas ce compte et la suppression de secours a échoué." }, 500);
    }
    console.error("PRYSM permanent account deletion failed:", deleteError.message);
    return json({ error: "La suppression définitive a échoué : " + deleteError.message }, 500);
  }
  return json({ success: true, username: targetProfile.username });
});
