import { json, normalizeClient, readJson, requireAdmin, supabase } from "./_supabase.mjs";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;

      const clients = await supabase("/clients?select=*&order=created_at.desc");
      json(res, 200, { clients });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const client = normalizeClient(body);

      if (!client.name || !client.phone || !client.topic || !client.message) {
        json(res, 400, { error: "Faltan datos del cliente." });
        return;
      }

      await supabase("/clients", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(client),
      });

      json(res, 201, { ok: true });
      return;
    }

    json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno." });
  }
}
