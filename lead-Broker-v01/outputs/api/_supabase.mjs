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

function valueOrCurrent(input, key, current = {}) {
  return Object.prototype.hasOwnProperty.call(input, key) ? input[key] : current[key];
}

function isImageSource(value) {
  const source = String(value || "").trim();
  return source.startsWith("data:image/") || source.startsWith("http://") || source.startsWith("https://");
}

function uniqueImages(images) {
  return Array.from(new Set((images || []).filter(isImageSource)));
}

export function normalizeLand(input, current = {}) {
  const rawImage = String(valueOrCurrent(input, "image", current) || "");
  const image = isImageSource(rawImage) ? rawImage : "";
  const gallery = Array.isArray(input.gallery) ? input.gallery : current.gallery || [];

  return {
    title: String(valueOrCurrent(input, "title", current) || "").trim(),
    price: String(valueOrCurrent(input, "price", current) || "").trim(),
    location: String(valueOrCurrent(input, "location", current) || "").trim(),
    map_url: String(valueOrCurrent(input, "map_url", current) || "").trim(),
    size: String(valueOrCurrent(input, "size", current) || "").trim(),
    description: String(valueOrCurrent(input, "description", current) || "").trim(),
    long_description: String(valueOrCurrent(input, "long_description", current) || "").trim(),
    seller_name: String(valueOrCurrent(input, "seller_name", current) || "").trim(),
    seller_phone: String(valueOrCurrent(input, "seller_phone", current) || "").trim(),
    seller_description: String(valueOrCurrent(input, "seller_description", current) || "").trim(),
    gallery: uniqueImages(gallery).filter((item) => item !== image),
    image,
  };
}

export function normalizeClient(input) {
  return {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    topic: String(input.topic || "").trim(),
    message: String(input.message || "").trim(),
    source: String(input.source || "Formulario de contacto").trim(),
  };
}
