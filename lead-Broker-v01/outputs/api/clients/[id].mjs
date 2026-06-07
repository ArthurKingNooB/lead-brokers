import { json, requireAdmin, supabase } from "../_supabase.mjs";

export default async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const id = String(req.query.id || "");

    if (req.method === "DELETE") {
      await supabase(`/clients?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      const clients = await supabase("/clients?select=*&order=created_at.desc");
      json(res, 200, { clients });
      return;
    }

    json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno." });
  }
}
