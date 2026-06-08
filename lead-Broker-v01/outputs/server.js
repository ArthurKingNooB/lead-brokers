const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "lands.json");
const clientsDbPath = path.join(dataDir, "clients.json");
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";
const adminPassword = process.env.ADMIN_PASSWORD || "agustina2026";
const sessions = new Set();

const defaultLands = [
  {
    id: "land-1",
    title: "Terreno urbano con servicios",
    status: "available",
    price: "USD 32.000",
    location: "Zona residencial",
    size: "420 m2",
    description: "Lote parejo, buen acceso, luz y agua disponibles. Ideal para vivienda o inversion.",
    long_description: "Lote parejo con buen acceso, servicios disponibles y entorno residencial. Ideal para vivienda familiar o inversion a mediano plazo.",
    seller_name: "Agustina",
    seller_phone: "092 420 997",
    seller_description: "Intermediaria comercial de Lead Brokers. Coordina consultas, visitas y seguimiento hasta el cierre.",
    gallery: [],
    image: "",
    map_url: "",
  },
  {
    id: "land-2",
    title: "Lote amplio para desarrollo",
    status: "available",
    price: "USD 58.000",
    location: "A metros de ruta principal",
    size: "900 m2",
    description: "Excelente frente, entorno en crecimiento y potencial para proyecto comercial.",
    long_description: "Terreno amplio con frente destacado, buena exposicion y acceso rapido. Recomendado para desarrollo, deposito, local o inversion comercial.",
    seller_name: "Agustina",
    seller_phone: "092 420 997",
    seller_description: "Lead Brokers acompana la conexion entre vendedor e interesados calificados.",
    gallery: [],
    image: "",
    map_url: "",
  },
  {
    id: "land-3",
    title: "Terreno listo para escriturar",
    status: "available",
    price: "Consultar",
    location: "Barrio tranquilo",
    size: "510 m2",
    description: "Documentacion ordenada, zona con buena demanda y consultas activas.",
    long_description: "Terreno en barrio tranquilo con documentacion ordenada. Buena opcion para quienes buscan avanzar con una operacion clara y acompanada.",
    seller_name: "Agustina",
    seller_phone: "092 420 997",
    seller_description: "Gestion comercial con foco en transparencia, contacto directo y cierre ordenado.",
    gallery: [],
    image: "",
    map_url: "",
  },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultLands, null, 2));
  }
  if (!fs.existsSync(clientsDbPath)) {
    fs.writeFileSync(clientsDbPath, JSON.stringify([], null, 2));
  }
}

function readLands() {
  ensureDb();
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [...defaultLands];
  } catch {
    return [...defaultLands];
  }
}

function writeLands(lands) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(lands, null, 2));
}

function readClients() {
  ensureDb();
  try {
    const parsed = JSON.parse(fs.readFileSync(clientsDbPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClients(clients) {
  ensureDb();
  fs.writeFileSync(clientsDbPath, JSON.stringify(clients, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 9_000_000) {
        reject(new Error("Archivo demasiado grande."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    req.on("error", reject);
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireAdmin(req, res) {
  const token = getToken(req);
  if (!token || !sessions.has(token)) {
    sendJson(res, 401, { error: "Sesion no autorizada." });
    return false;
  }
  return true;
}

function cleanLand(input, current = {}) {
  const rawImage = String(valueOrCurrent(input, "image", current) || "");
  const image = isImageSource(rawImage) ? rawImage : "";
  const gallery = Array.isArray(input.gallery) ? input.gallery : current.gallery || [];

  return {
    id: current.id || input.id || `land-${Date.now()}`,
    title: String(valueOrCurrent(input, "title", current) || "").trim(),
    status: String(valueOrCurrent(input, "status", current) || "available").trim(),
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
    created_at: current.created_at || input.created_at || new Date().toISOString(),
    updated_at: current.id ? new Date().toISOString() : valueOrCurrent(input, "updated_at", current),
  };
}

function cleanClient(input) {
  return {
    id: input.id || `client-${Date.now()}`,
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    topic: String(input.topic || "").trim(),
    message: String(input.message || "").trim(),
    source: String(input.source || "Formulario de contacto").trim(),
    created_at: input.created_at || new Date().toISOString(),
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/lands") {
    sendJson(res, 200, { lands: readLands() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/clients") {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, { clients: readClients() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/clients") {
    const body = await readBody(req);
    const clients = readClients();
    const client = cleanClient(body);

    if (!client.name || !client.phone || !client.topic || !client.message) {
      sendJson(res, 400, { error: "Faltan datos del cliente." });
      return;
    }

    clients.unshift(client);
    writeClients(clients);
    sendJson(res, 201, { ok: true });
    return;
  }

  const clientMatch = url.pathname.match(/^\/api\/clients\/([^/]+)$/);
  if (clientMatch && req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(clientMatch[1]);
    const clients = readClients().filter((client) => client.id !== id);
    writeClients(clients);
    sendJson(res, 200, { clients });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    if (body.password !== adminPassword) {
      sendJson(res, 401, { error: "Contraseña incorrecta." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    sendJson(res, 200, { token });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lands/reset") {
    if (!requireAdmin(req, res)) return;
    writeLands(defaultLands);
    sendJson(res, 200, { lands: readLands() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lands") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const lands = readLands();
    const land = cleanLand(body);

    if (!land.title || !land.price || !land.location || !land.size || !land.description) {
      sendJson(res, 400, { error: "Faltan datos del terreno." });
      return;
    }

    lands.unshift(land);
    writeLands(lands);
    sendJson(res, 201, { lands });
    return;
  }

  const landMatch = url.pathname.match(/^\/api\/lands\/([^/]+)$/);
  if (landMatch && req.method === "PUT") {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(landMatch[1]);
    const body = await readBody(req);
    const lands = readLands();
    const index = lands.findIndex((land) => land.id === id);

    if (index < 0) {
      sendJson(res, 404, { error: "Terreno no encontrado." });
      return;
    }

    lands[index] = cleanLand({ ...body, id }, lands[index]);
    writeLands(lands);
    sendJson(res, 200, { lands });
    return;
  }

  if (landMatch && req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(landMatch[1]);
    const lands = readLands().filter((land) => land.id !== id);
    writeLands(lands);
    sendJson(res, 200, { lands });
    return;
  }

  sendJson(res, 404, { error: "API no encontrada." });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Error interno." });
  }
});

ensureDb();
server.listen(port, host, () => {
  console.log(`Lead Brokers DB server running at http://localhost:${port}`);
  console.log(`Admin password: ${adminPassword}`);
});
