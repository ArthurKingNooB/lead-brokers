import crypto from "node:crypto";
import { json, readJson } from "./_supabase.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Metodo no permitido." });
    return;
  }

  const body = await readJson(req);
  const password = process.env.ADMIN_PASSWORD || "agustina2026";

  if (body.password !== password) {
    json(res, 401, { error: "Contraseña incorrecta." });
    return;
  }

  const token = process.env.ADMIN_TOKEN || crypto.randomBytes(24).toString("hex");
  json(res, 200, { token });
}
