import { json, normalizeLand, readJson, requireAdmin, supabase } from "./_supabase.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const lands = await supabase("/lands?select=*&order=created_at.desc");
      json(res, 200, { lands });
      return;
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = await readJson(req);
      const land = normalizeLand(body);

      if (!land.title || !land.price || !land.location || !land.size || !land.description) {
        json(res, 400, { error: "Faltan datos del terreno." });
        return;
      }

      await supabase("/lands", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(land),
      });

      const lands = await supabase("/lands?select=*&order=created_at.desc");
      json(res, 201, { lands });
      return;
    }

    json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno." });
  }
}
