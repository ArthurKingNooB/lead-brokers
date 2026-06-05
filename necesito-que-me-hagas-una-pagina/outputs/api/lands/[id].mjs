import { json, normalizeLand, readJson, requireAdmin, supabase } from "../_supabase.mjs";

export default async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const id = String(req.query.id || "");

    if (req.method === "PUT") {
      const body = await readJson(req);
      const land = normalizeLand(body);

      await supabase(`/lands?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(land),
      });

      const lands = await supabase("/lands?select=*&order=created_at.desc");
      json(res, 200, { lands });
      return;
    }

    if (req.method === "DELETE") {
      await supabase(`/lands?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      const lands = await supabase("/lands?select=*&order=created_at.desc");
      json(res, 200, { lands });
      return;
    }

    json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno." });
  }
}
