const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "lands.json");
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";
const adminPassword = process.env.ADMIN_PASSWORD || "agustina2026";
const sessions = new Set();

const defaultLands = [
  {
    id: "land-1",
    title: "Terreno urbano con servicios",
    price: "USD 32.000",
    location: "Zona residencial",
    size: "420 m2",
    description: "Lote parejo, buen acceso, luz y agua disponibles. Ideal para vivienda o inversion.",
    image: "",
  },
  {
    id: "land-2",
    title: "Lote amplio para desarrollo",
    price: "USD 58.000",
    location: "A metros de ruta principal",
    size: "900 m2",
    description: "Excelente frente, entorno en crecimiento y potencial para proyecto comercial.",
    image: "",
  },
  {
    id: "land-3",
    title: "Terreno listo para escriturar",
    price: "Consultar",
    location: "Barrio tranquilo",
    size: "510 m2",
    description: "Documentacion ordenada, zona con buena demanda y consultas activas.",
    image: "",
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
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
  return {
    id: current.id || input.id || `land-${Date.now()}`,
    title: String(input.title || current.title || "").trim(),
    price: String(input.price || current.price || "").trim(),
    location: String(input.location || current.location || "").trim(),
    size: String(input.size || current.size || "").trim(),
    description: String(input.description || current.description || "").trim(),
    image: String(input.image || current.image || ""),
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/lands") {
    sendJson(res, 200, { lands: readLands() });
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
