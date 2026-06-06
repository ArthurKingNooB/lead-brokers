const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

export function assertEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
}

export function json(res, status, payload) {
  res.status(status).json(payload);
}

export async function readJson(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  return JSON.parse(req.body);
}

export function requireAdmin(req, res) {
  const configuredToken = process.env.ADMIN_TOKEN;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!configuredToken || token !== configuredToken) {
    json(res, 401, { error: "Sesion no autorizada." });
    return false;
  }

  return true;
}

export async function supabase(path, options = {}) {
  assertEnv();

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Error en Supabase");
  }

  return payload;
}

export function normalizeLand(input, current = {}) {
  return {
    title: String(input.title || current.title || "").trim(),
    price: String(input.price || current.price || "").trim(),
    location: String(input.location || current.location || "").trim(),
    size: String(input.size || current.size || "").trim(),
    description: String(input.description || current.description || "").trim(),
    long_description: String(input.long_description || current.long_description || "").trim(),
    seller_name: String(input.seller_name || current.seller_name || "").trim(),
    seller_phone: String(input.seller_phone || current.seller_phone || "").trim(),
    seller_description: String(input.seller_description || current.seller_description || "").trim(),
    gallery: Array.isArray(input.gallery) ? input.gallery : current.gallery || [],
    image: String(input.image || current.image || ""),
  };
}
