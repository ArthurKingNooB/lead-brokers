const phoneNumber = "59892420997";
const baseMessage = "Hola Agustina, quiero consultar por Lead Brokers.";
const publicSiteUrl = "https://lead-broker-chi.vercel.app/";
const landsStorageKey = "lead-brokers-lands-fallback";
const clientsStorageKey = "lead-brokers-clients-fallback";
const adminTokenKey = "lead-brokers-admin-token";
const fallbackPassword = "agustina2026";

let apiOnline = true;
let landsCache = [];
let clientsCache = [];
let removedImageUrls = new Set();
let imageManagerItems = [];

const properties = [
  {
    title: "Casa o departamento",
    description: "Captacion de interesados para venta o alquiler con seguimiento comercial.",
    type: "venta",
    initials: "PH",
  },
  {
    title: "Terreno o lote",
    description: "Difusion, consultas filtradas y conexion con compradores o inversores.",
    type: "terreno",
    initials: "TR",
  },
  {
    title: "Local comercial",
    description: "Ideal para negocios, franquicias, oficinas, depositos o proyectos activos.",
    type: "local",
    initials: "LC",
  },
  {
    title: "Oportunidad de inversion",
    description: "Busqueda de personas correctas para activos, emprendimientos y operaciones.",
    type: "venta",
    initials: "IN",
  },
];

const defaultLands = [
  {
    id: "land-1",
    title: "Terreno urbano con servicios",
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

function whatsappUrl(message) {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatThousands(value) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("es-UY");
}

function formatPrice(currency, amount) {
  const formattedAmount = formatThousands(amount);
  if (!formattedAmount) return "Consultar";
  return currency === "UYU" ? `$ ${formattedAmount}` : `USD ${formattedAmount}`;
}

function formatSize(value) {
  const formattedSize = formatThousands(value);
  return formattedSize ? `${formattedSize} m²` : "";
}

function parseSize(size) {
  return onlyDigits(size);
}

function parsePrice(price) {
  const value = String(price || "");
  const currency = value.trim().startsWith("$") ? "UYU" : "USD";
  return {
    currency,
    amount: onlyDigits(value),
  };
}

function displayPrice(land) {
  return formatPrice(land.priceCurrency || parsePrice(land.price).currency, land.priceAmount || parsePrice(land.price).amount);
}

function setWhatsappLinks() {
  const url = whatsappUrl(baseMessage);
  ["heroWhatsapp", "directWhatsapp", "floatingWhatsapp"].forEach((id) => {
    const link = document.getElementById(id);
    if (link) link.href = url;
  });
}

function landShareUrl(land) {
  const url = new URL(publicSiteUrl);
  url.hash = `terreno-${land.id}`;
  return url.toString();
}

function landMapUrl(land) {
  const rawUrl = String(land.map_url || land.mapUrl || "").trim();
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;

  const query = [land.location, land.title].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "terreno")}`;
}

function renderProperties(filter = "all") {
  const list = document.getElementById("propertyList");
  if (!list) return;

  const filtered = properties.filter((item) => filter === "all" || item.type === filter);
  list.innerHTML = filtered
    .map(
      (item) => `
        <article class="property-item">
          <span class="property-thumb">${item.initials}</span>
          <div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <span class="tag">${item.type}</span>
        </article>
      `
    )
    .join("");
}

function getToken() {
  return sessionStorage.getItem(adminTokenKey);
}

function setToken(token) {
  if (token) {
    sessionStorage.setItem(adminTokenKey, token);
  } else {
    sessionStorage.removeItem(adminTokenKey);
  }
}

function isAdminLoggedIn() {
  return Boolean(getToken());
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();

  if (token && token !== "fallback-local") {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text.trim() };
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || text || "Error de servidor";
    if (response.status === 413 || /request entity too large/i.test(message)) {
      throw new Error("Las imágenes son demasiado pesadas. Probá con menos fotos o fotos más livianas.");
    }
    throw new Error(message);
  }

  return payload;
}

function loadFallbackLands() {
  const saved = localStorage.getItem(landsStorageKey);
  if (!saved) return [...defaultLands];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...defaultLands];
  } catch {
    return [...defaultLands];
  }
}

function saveFallbackLands(lands) {
  localStorage.setItem(landsStorageKey, JSON.stringify(lands));
}

function loadFallbackClients() {
  const saved = localStorage.getItem(clientsStorageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFallbackClients(clients) {
  localStorage.setItem(clientsStorageKey, JSON.stringify(clients));
}

async function loadLands() {
  if (apiOnline) {
    try {
      const payload = await apiRequest("/api/lands");
      landsCache = payload.lands || [];
      return landsCache;
    } catch {
      apiOnline = false;
    }
  }

  landsCache = loadFallbackLands();
  return landsCache;
}

async function loadClients() {
  if (apiOnline) {
    try {
      const payload = await apiRequest("/api/clients");
      clientsCache = payload.clients || [];
      return clientsCache;
    } catch {
      clientsCache = loadFallbackClients();
      return clientsCache;
    }
  }

  clientsCache = loadFallbackClients();
  return clientsCache;
}

async function saveClient(client) {
  if (apiOnline) {
    const payload = await apiRequest("/api/clients", {
      method: "POST",
      body: JSON.stringify(client),
    });
    clientsCache = payload.clients || clientsCache;
    return clientsCache;
  }

  const clients = loadFallbackClients();
  clients.unshift({ ...client, id: `client-${Date.now()}`, created_at: new Date().toISOString() });
  saveFallbackClients(clients);
  clientsCache = clients;
  return clientsCache;
}

async function deleteClient(id) {
  if (apiOnline) {
    const payload = await apiRequest(`/api/clients/${encodeURIComponent(id)}`, { method: "DELETE" });
    clientsCache = payload.clients || [];
    return clientsCache;
  }

  const clients = loadFallbackClients().filter((client) => client.id !== id);
  saveFallbackClients(clients);
  clientsCache = clients;
  return clientsCache;
}

async function loginAdmin(password) {
  if (apiOnline) {
    try {
      const payload = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setToken(payload.token);
      return true;
    } catch (error) {
      if (error.message !== "Contraseña incorrecta.") {
        apiOnline = false;
      } else {
        throw error;
      }
    }
  }

  if (password !== fallbackPassword) {
    throw new Error("Contraseña incorrecta.");
  }
  setToken("fallback-local");
  return true;
}

async function saveLand(land) {
  if (apiOnline) {
    const payload = await apiRequest(land.id ? `/api/lands/${encodeURIComponent(land.id)}` : "/api/lands", {
      method: land.id ? "PUT" : "POST",
      body: JSON.stringify(land),
    });
    landsCache = payload.lands || [];
    return landsCache;
  }

  const lands = loadFallbackLands();
  if (land.id) {
    const index = lands.findIndex((item) => item.id === land.id);
    if (index >= 0) lands[index] = { ...lands[index], ...land };
  } else {
    lands.unshift({ ...land, id: `land-${Date.now()}` });
  }
  saveFallbackLands(lands);
  landsCache = lands;
  return lands;
}

async function deleteLand(id) {
  if (apiOnline) {
    const payload = await apiRequest(`/api/lands/${encodeURIComponent(id)}`, { method: "DELETE" });
    landsCache = payload.lands || [];
    return landsCache;
  }

  const lands = loadFallbackLands().filter((land) => land.id !== id);
  saveFallbackLands(lands);
  landsCache = lands;
  return lands;
}

async function resetLands() {
  if (apiOnline) {
    const payload = await apiRequest("/api/lands/reset", { method: "POST" });
    landsCache = payload.lands || [];
    return landsCache;
  }

  saveFallbackLands(defaultLands);
  landsCache = [...defaultLands];
  return landsCache;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function placeholderLandSvg(title) {
  const label = escapeHtml(title || "Terreno disponible");
  return `
    <svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="landBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#18372f" />
          <stop offset="1" stop-color="#07110f" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#landBg)" />
      <path d="M0 312 C92 244 154 330 258 268 C350 214 432 228 640 124 V420 H0 Z" fill="#1f6f4c" opacity=".72" />
      <path d="M0 350 C140 284 236 388 360 302 C446 242 530 270 640 224 V420 H0 Z" fill="#d5a764" opacity=".42" />
      <path d="M82 128 H492" stroke="#f0d7a4" stroke-width="5" opacity=".85" />
      <path d="M492 128 L454 104 M492 128 L454 152" stroke="#f0d7a4" stroke-width="5" stroke-linecap="round" />
      <text x="54" y="88" fill="#f8f1e5" font-family="Arial, sans-serif" font-size="28" font-weight="800">${label}</text>
      <circle cx="104" cy="244" r="18" fill="#f0d7a4" />
      <path d="M104 262 C72 298 64 330 64 330 H150 C150 330 136 296 104 262 Z" fill="#f0d7a4" opacity=".8" />
    </svg>
  `;
}

function landCardImage(land) {
  const image = landImages(land)[0];
  if (image) {
    return `<img src="${image}" alt="Imagen de ${escapeHtml(land.title)}" />`;
  }

  return placeholderLandSvg(land.title);
}

function landImages(land = {}) {
  const gallery = Array.isArray(land.gallery) ? land.gallery : [];
  return [land.image, ...gallery].filter(isImageSource);
}

function isImageSource(value) {
  const source = String(value || "").trim();
  return source.startsWith("data:image/") || source.startsWith("http://") || source.startsWith("https://");
}

function uniqueImages(images) {
  return Array.from(new Set((images || []).filter(isImageSource)));
}

function buildImagePayload(currentLand, uploadedMainImage, uploadedGallery, removedImages = new Set()) {
  const currentImage = isImageSource(currentLand?.image) && !removedImages.has(currentLand.image) ? currentLand.image : "";
  const currentGallery = Array.isArray(currentLand?.gallery)
    ? currentLand.gallery.filter((image) => isImageSource(image) && !removedImages.has(image))
    : [];
  const nextGallery = uploadedGallery.filter(isImageSource);
  const nextImage = uploadedMainImage || currentImage || nextGallery[0] || "";
  const gallerySeed = uploadedMainImage && currentImage && currentImage !== uploadedMainImage && !removedImages.has(currentImage)
    ? [currentImage, ...currentGallery]
    : currentGallery;

  return {
    image: nextImage,
    gallery: uniqueImages([...gallerySeed, ...nextGallery]).filter((image) => image !== nextImage),
  };
}

function galleryItem(image, land, className, index = 0) {
  const isThumb = className.includes("thumb");
  const attributes = isThumb
    ? `role="button" tabindex="0" data-gallery-index="${index}"`
    : `role="button" tabindex="0" data-gallery-main data-open-image`;
  const activeClass = isThumb && index === 0 ? " is-active" : "";

  return image
    ? `<div class="${className}${activeClass}" ${attributes}><img src="${image}" alt="Imagen de ${escapeHtml(land.title)}" /></div>`
    : `<div class="${className}${activeClass}" ${attributes}>${placeholderLandSvg(land.title)}</div>`;
}

function openLandDetail(id) {
  const land = landsCache.find((item) => item.id === id);
  const modal = document.getElementById("landDetailModal");
  const content = document.getElementById("landDetailContent");
  if (!land || !modal || !content) return;

  const landPrice = displayPrice(land);
  const images = landImages(land);
  const galleryImages = images.length ? images : [""];
  const mainImage = galleryImages[0];
  const thumbs = galleryImages.slice(0, 6);
  const sellerName = land.seller_name || land.sellerName || "Agustina";
  const sellerPhone = land.seller_phone || land.sellerPhone || "092 420 997";
  const sellerDescription =
    land.seller_description ||
    land.sellerDescription ||
    "Intermediacion comercial con seguimiento personalizado para coordinar consultas, visitas y cierre.";
  const longDescription = land.long_description || land.longDescription || land.description;
  const message = [
    "Hola Agustina, quiero consultar por este terreno.",
    `Terreno: ${land.title}`,
    `Precio: ${landPrice}`,
    `Ubicacion: ${land.location}`,
    `Superficie: ${land.size}`,
    `Mapa: ${landMapUrl(land)}`,
  ].join("\n");
  const shareUrl = landShareUrl(land);
  const mapUrl = landMapUrl(land);

  content.dataset.gallery = JSON.stringify(galleryImages);
  content.dataset.landTitle = land.title;
  content.innerHTML = `
    <div class="land-detail-head">
      <div>
        <p class="eyebrow">Ficha del terreno</p>
        <h2>${escapeHtml(land.title)}</h2>
        <div class="land-meta">
          <span>${escapeHtml(landPrice)}</span>
          <span>${escapeHtml(land.location)}</span>
          <span>${escapeHtml(land.size)}</span>
        </div>
      </div>
      <button class="land-detail-close" type="button" data-close-detail aria-label="Cerrar">×</button>
    </div>
    <div class="land-gallery">
      ${galleryItem(mainImage, land, "land-gallery-main", 0)}
      <div class="land-gallery-thumbs">
        ${thumbs.map((image, index) => galleryItem(image, land, "land-gallery-thumb", index)).join("")}
      </div>
    </div>
    <div class="land-detail-grid">
      <div class="land-detail-panel">
        <h3>Descripcion completa</h3>
        <p>${escapeHtml(longDescription).replaceAll("\n", "<br>")}</p>
      </div>
      <aside class="land-detail-panel seller-box">
        <h3>Vendedor</h3>
        <strong>${escapeHtml(sellerName)}</strong>
        <p>${escapeHtml(sellerDescription).replaceAll("\n", "<br>")}</p>
        <span class="tag">${escapeHtml(sellerPhone)}</span>
        <a class="btn ghost" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Ver en Google Maps</a>
        <button class="btn ghost" type="button" data-share-land-id="${escapeHtml(land.id)}">Compartir ficha</button>
        <a class="btn primary" href="${whatsappUrl(message)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        <span class="file-helper" data-share-status>Link directo: ${escapeHtml(shareUrl)}</span>
      </aside>
    </div>
  `;

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "");
  }
}

async function renderLands() {
  const list = document.getElementById("landList");
  const search = document.getElementById("landSearch");
  if (!list) return;

  const query = search ? search.value.trim().toLowerCase() : "";
  const lands = await loadLands();
  const admin = isAdminLoggedIn();
  const filtered = lands.filter((land) =>
    [land.title, displayPrice(land), land.location, land.size, land.description]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">No hay terrenos que coincidan con la busqueda.</div>`;
    return;
  }

  list.innerHTML = filtered
    .map((land) => {
      const landPrice = displayPrice(land);
      const message = [
        "Hola Agustina, quiero consultar por este terreno.",
        `Terreno: ${land.title}`,
        `Precio: ${landPrice}`,
        `Ubicacion: ${land.location}`,
        `Superficie: ${land.size}`,
        `Mapa: ${landMapUrl(land)}`,
      ].join("\n");
      const mapUrl = landMapUrl(land);

      return `
        <article class="land-card">
          <div class="land-image">
            ${landCardImage(land)}
            <span class="land-price">${escapeHtml(landPrice)}</span>
          </div>
          <div class="land-body">
            <div>
              <h3>${escapeHtml(land.title)}</h3>
              <div class="land-meta">
                <span>${escapeHtml(land.location)}</span>
                <span>${escapeHtml(land.size)}</span>
              </div>
            </div>
            <p>${escapeHtml(land.description)}</p>
            <div class="land-actions">
              <button class="view-land" type="button" data-land-id="${escapeHtml(land.id)}">Ver ficha</button>
              <a class="btn primary" href="${whatsappUrl(message)}" target="_blank" rel="noopener">WhatsApp</a>
              <a class="map-land" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Mapa</a>
              <button class="share-land" type="button" data-share-land-id="${escapeHtml(land.id)}">Compartir</button>
              <button class="edit-land ${admin ? "" : "is-hidden"}" type="button" data-land-id="${escapeHtml(land.id)}">Editar</button>
              <button class="delete-land ${admin ? "" : "is-hidden"}" type="button" data-land-id="${escapeHtml(land.id)}">Borrar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function openLandFromHash() {
  const match = window.location.hash.match(/^#terreno-(.+)$/);
  if (match) openLandDetail(decodeURIComponent(match[1]));
}

async function updateAdminUi() {
  const admin = isAdminLoggedIn();
  const loginButton = document.getElementById("loginButton");
  const form = document.getElementById("landForm");

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("is-hidden", !admin);
  });

  if (loginButton) {
    loginButton.textContent = admin ? "Cerrar sesion" : "Acceso Agustina";
  }

  if (!admin && form) {
    form.classList.add("is-hidden");
  }

  await renderLands();
  await renderClients();
}

function clientDate(value) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "Sin fecha";
  }
}

function clientFollowUpMessage(client) {
  const name = String(client.name || "").trim() || "buenas";
  const topic = String(client.topic || "").toLowerCase();

  if (topic.includes("vender una propiedad")) {
    return `Hola, ${name}. Te escribo por tu consulta. ¿Querés vender una propiedad? Contame bien qué tenés, dónde está ubicada y qué objetivo tenés con la venta.`;
  }

  if (topic.includes("terreno")) {
    return `Hola, ${name}. Te escribo por tu consulta sobre terrenos. Contame bien qué querés publicar o qué tipo de terreno estás buscando, así te puedo orientar mejor.`;
  }

  if (topic.includes("proveedores")) {
    return `Hola, ${name}. Te escribo por tu consulta. ¿Necesitás proveedores para construir, arreglar o mantener algo? Contame qué necesitás y en qué zona.`;
  }

  if (topic.includes("local") || topic.includes("negocio") || topic.includes("invers")) {
    return `Hola, ${name}. Te escribo por tu consulta. ¿Estás buscando local, negocio o una inversión? Contame bien qué estás necesitando y con qué presupuesto aproximado.`;
  }

  if (topic.includes("contrato") || topic.includes("cierre")) {
    return `Hola, ${name}. Te escribo por tu consulta. Contame un poco más sobre la operación o contrato que querés cerrar, así vemos cómo ayudarte.`;
  }

  if (topic.includes("dame más info") || topic.includes("dame mas info")) {
    return `Hola, ${name}. Te escribo por tu consulta. Vi que querés más información. Contame un poquito qué estás buscando y te oriento.`;
  }

  return `Hola, ${name}. Te escribo por tu consulta. Contame bien qué necesitás y cómo te puedo ayudar.`;
}

async function renderClients() {
  const list = document.getElementById("clientList");
  if (!list) return;

  if (!isAdminLoggedIn()) {
    clientsCache = [];
    list.innerHTML = `<div class="empty-state">Inicia sesion para ver clientes registrados.</div>`;
    return;
  }

  const clients = await loadClients();
  if (!clients.length) {
    list.innerHTML = `<div class="empty-state">Todavia no hay clientes registrados.</div>`;
    return;
  }

  list.innerHTML = clients
    .map(
      (client) => `
        <article class="client-card">
          <div>
            <strong>${escapeHtml(client.name)}</strong>
            <span>${escapeHtml(clientDate(client.created_at))}</span>
          </div>
          <p>${escapeHtml(client.topic)}</p>
          <p>${escapeHtml(client.message)}</p>
          <div class="client-actions">
            <a class="btn ghost" href="${whatsappUrl(clientFollowUpMessage(client))}" target="_blank" rel="noopener">${escapeHtml(client.phone)}</a>
            <button class="client-done" type="button" data-client-id="${escapeHtml(client.id)}">Listo</button>
          </div>
        </article>
      `
    )
    .join("");
}

async function shareLand(id) {
  const land = landsCache.find((item) => item.id === id);
  if (!land) return;

  const text = `${land.title} - ${displayPrice(land)}\n${landShareUrl(land)}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Copiar link del terreno:", text);
  }
}

function resetLandForm() {
  const form = document.getElementById("landForm");
  const title = document.getElementById("landFormTitle");
  const note = document.getElementById("landNote");
  const submitButton = document.getElementById("landSubmitButton");
  const galleryCount = document.getElementById("galleryCount");
  const savedImagesPanel = document.getElementById("savedImagesPanel");
  const savedImagesGrid = document.getElementById("savedImagesGrid");
  if (!form) return;

  form.reset();
  form.elements.landId.value = "";
  removedImageUrls = new Set();
  imageManagerItems = [];
  if (form.elements.priceCurrency) form.elements.priceCurrency.value = "USD";
  updatePricePreview();
  if (title) title.textContent = "Subir nuevo terreno";
  if (submitButton) submitButton.textContent = "Publicar terreno";
  if (note) note.textContent = "";
  if (galleryCount) galleryCount.textContent = "Podés elegir varias fotos juntas desde tu PC.";
  if (savedImagesPanel) savedImagesPanel.classList.add("is-hidden");
  if (savedImagesGrid) savedImagesGrid.innerHTML = "";
}

function closeLandForm() {
  const form = document.getElementById("landForm");
  resetLandForm();
  if (form) form.classList.add("is-hidden");
}

function updatePricePreview() {
  const currency = document.getElementById("priceCurrency");
  const amount = document.getElementById("priceAmount");
  const preview = document.getElementById("pricePreview");
  if (!currency || !amount || !preview) return;

  preview.textContent = `Vista previa: ${formatPrice(currency.value, amount.value || "32000")}`;
}

function imageLoaded(image) {
  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

async function fileToDataUrl(file) {
  if (!file || !file.size || !file.type.startsWith("image/")) {
    return "";
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    image.src = objectUrl;
    await imageLoaded(image);

    const maxWidth = 1400;
    const maxHeight = 1100;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.74);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function filesToDataUrls(files) {
  return Promise.all(Array.from(files || []).map((file) => fileToDataUrl(file)));
}

function renderSavedImagesManager(land) {
  const panel = document.getElementById("savedImagesPanel");
  const grid = document.getElementById("savedImagesGrid");
  const note = document.getElementById("savedImagesNote");
  if (!panel || !grid) return;

  imageManagerItems = landImages(land).filter((image) => !removedImageUrls.has(image));

  if (!land?.id || !imageManagerItems.length) {
    panel.classList.toggle("is-hidden", !land?.id);
    grid.innerHTML = land?.id ? `<div class="empty-state">No quedan imágenes guardadas para este terreno.</div>` : "";
    if (note) note.textContent = land?.id ? "Podés cargar nuevas imágenes desde los campos de arriba." : "";
    return;
  }

  panel.classList.remove("is-hidden");
  grid.innerHTML = imageManagerItems
    .map((image, index) => `
      <article class="saved-image-card">
        <img src="${escapeHtml(image)}" alt="Imagen guardada ${index + 1}" />
        <button type="button" data-remove-saved-image="${index}">Quitar</button>
      </article>
    `)
    .join("");

  if (note) note.textContent = "Las fotos quitadas se eliminan cuando guardás los cambios.";
}

function setupLandManager() {
  const form = document.getElementById("landForm");
  const toggle = document.getElementById("toggleAdmin");
  const reset = document.getElementById("resetLands");
  const cancelEdit = document.getElementById("cancelEdit");
  const note = document.getElementById("landNote");
  const search = document.getElementById("landSearch");
  const list = document.getElementById("landList");
  const priceCurrency = document.getElementById("priceCurrency");
  const priceAmount = document.getElementById("priceAmount");
  const galleryInput = document.getElementById("galleryInput");
  const galleryCount = document.getElementById("galleryCount");

  if (!form || !toggle || !list) return;

  const sizeInput = form.elements.size;

  toggle.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;
    form.classList.toggle("is-hidden");
  });

  if (search) {
    search.addEventListener("input", () => renderLands());
  }

  if (priceCurrency) {
    priceCurrency.addEventListener("change", updatePricePreview);
  }

  if (priceAmount) {
    priceAmount.addEventListener("input", () => {
      const position = priceAmount.selectionStart;
      priceAmount.value = formatThousands(priceAmount.value);
      priceAmount.setSelectionRange(priceAmount.value.length, priceAmount.value.length || position);
      updatePricePreview();
    });
  }

  if (sizeInput) {
    sizeInput.addEventListener("focus", () => {
      sizeInput.value = formatThousands(sizeInput.value);
    });

    sizeInput.addEventListener("input", () => {
      const position = sizeInput.selectionStart;
      sizeInput.value = formatThousands(sizeInput.value);
      sizeInput.setSelectionRange(sizeInput.value.length, sizeInput.value.length || position);
    });

    sizeInput.addEventListener("blur", () => {
      sizeInput.value = formatSize(sizeInput.value);
    });
  }

  if (galleryInput && galleryCount) {
    galleryInput.addEventListener("change", () => {
      const count = galleryInput.files ? galleryInput.files.length : 0;
      galleryCount.textContent = count
        ? `${count} ${count === 1 ? "foto seleccionada" : "fotos seleccionadas"} para cargar.`
        : "Podés elegir varias fotos juntas desde tu PC.";
    });
  }

  if (reset) {
    reset.addEventListener("click", async () => {
      if (!isAdminLoggedIn()) return;
      await resetLands();
      resetLandForm();
      await renderLands();
      if (note) note.textContent = "Se restauraron los terrenos de ejemplo.";
    });
  }

  if (cancelEdit) {
    cancelEdit.addEventListener("click", closeLandForm);
  }

  list.addEventListener("click", async (event) => {
    const viewButton = event.target.closest(".view-land");
    if (viewButton) {
      openLandDetail(viewButton.dataset.landId);
      return;
    }

    const shareButton = event.target.closest("[data-share-land-id]");
    if (shareButton) {
      await shareLand(shareButton.dataset.shareLandId);
      if (note) note.textContent = "Link del terreno copiado para compartir.";
      return;
    }

    if (!isAdminLoggedIn()) return;

    const editButton = event.target.closest(".edit-land");
    const deleteButton = event.target.closest(".delete-land");

    if (editButton) {
      const land = landsCache.find((item) => item.id === editButton.dataset.landId);
      const title = document.getElementById("landFormTitle");
      const submitButton = document.getElementById("landSubmitButton");
      if (!land) return;

      form.classList.remove("is-hidden");
      const parsedPrice = parsePrice(land.price);
      form.elements.landId.value = land.id;
      form.elements.title.value = land.title;
      form.elements.priceCurrency.value = land.priceCurrency || parsedPrice.currency;
      form.elements.priceAmount.value = formatThousands(land.priceAmount || parsedPrice.amount);
      form.elements.location.value = land.location;
      form.elements.mapUrl.value = land.map_url || land.mapUrl || "";
      form.elements.size.value = formatSize(parseSize(land.size));
      form.elements.description.value = land.description;
      form.elements.longDescription.value = land.long_description || land.longDescription || "";
      form.elements.sellerName.value = land.seller_name || land.sellerName || "";
      form.elements.sellerPhone.value = land.seller_phone || land.sellerPhone || "";
      form.elements.sellerDescription.value = land.seller_description || land.sellerDescription || "";
      removedImageUrls = new Set();
      renderSavedImagesManager(land);
      updatePricePreview();
      if (title) title.textContent = "Editar terreno";
      if (submitButton) submitButton.textContent = "Guardar cambios";
      if (note) note.textContent = "Editando terreno. La imagen principal cambia si subis una nueva; las fotos de galeria nuevas se suman a las existentes.";
      if (galleryCount) galleryCount.textContent = "Podés sumar varias fotos nuevas desde tu PC.";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (!deleteButton) return;

    await deleteLand(deleteButton.dataset.landId);
    await renderLands();
  });

  form.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-saved-image]");
    if (!removeButton) return;

    const index = Number(removeButton.dataset.removeSavedImage);
    const image = imageManagerItems[index];
    if (!image) return;

    removedImageUrls.add(image);
    const editingId = form.elements.landId.value;
    const land = landsCache.find((item) => item.id === editingId);
    renderSavedImagesManager(land);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isAdminLoggedIn()) return;

    const submitButton = document.getElementById("landSubmitButton");
    const data = new FormData(form);
    const editingId = data.get("landId");

    try {
      if (note) note.textContent = editingId ? "Guardando cambios..." : "Publicando terreno...";
      if (submitButton) submitButton.disabled = true;

      const image = await fileToDataUrl(data.get("image"));
      const gallery = await filesToDataUrls(data.getAll("gallery").filter((file) => file && file.size));
      const currentLand = landsCache.find((land) => land.id === editingId);
      const imagePayload = buildImagePayload(currentLand, image, gallery, removedImageUrls);
      const currency = data.get("priceCurrency");
      const amount = onlyDigits(data.get("priceAmount"));

      await saveLand({
        id: editingId || undefined,
        title: data.get("title"),
        price: formatPrice(currency, amount),
        location: data.get("location"),
        map_url: data.get("mapUrl"),
        size: formatSize(data.get("size")),
        description: data.get("description"),
        long_description: data.get("longDescription"),
        seller_name: data.get("sellerName"),
        seller_phone: data.get("sellerPhone"),
        seller_description: data.get("sellerDescription"),
        gallery: imagePayload.gallery,
        image: imagePayload.image,
      });

      resetLandForm();
      form.classList.add("is-hidden");
      await renderLands();
      if (note) note.textContent = editingId ? "Terreno actualizado en la base de datos." : "Terreno publicado en la base de datos.";
    } catch (error) {
      if (note) {
        const needsSql = /column|schema cache|map_url|gallery|long_description|seller_/i.test(error.message);
        note.textContent = needsSql
          ? `No se pudo guardar: ${error.message}. Ejecutá el SQL actualizado en Supabase.`
          : `No se pudo guardar: ${error.message}`;
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  const refreshClients = document.getElementById("refreshClients");
  if (refreshClients) {
    refreshClients.addEventListener("click", renderClients);
  }

  const clientList = document.getElementById("clientList");
  if (clientList) {
    clientList.addEventListener("click", async (event) => {
      const doneButton = event.target.closest("[data-client-id]");
      if (!doneButton || !isAdminLoggedIn()) return;

      doneButton.disabled = true;
      doneButton.textContent = "Guardando...";
      await deleteClient(doneButton.dataset.clientId);
      await renderClients();
    });
  }
}

function setupLandDetailModal() {
  const modal = document.getElementById("landDetailModal");
  const content = document.getElementById("landDetailContent");
  if (!modal || !content) return;

  content.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-detail]")) {
      modal.close();
      return;
    }

    const shareButton = event.target.closest("[data-share-land-id]");
    if (shareButton) {
      await shareLand(shareButton.dataset.shareLandId);
      const helper = content.querySelector("[data-share-status]");
      if (helper) helper.textContent = "Link copiado para compartir.";
      return;
    }

    const mainImage = event.target.closest("[data-open-image]");
    if (mainImage) {
      openImageModal(mainImage.querySelector("img")?.src || "");
      return;
    }

    const thumb = event.target.closest("[data-gallery-index]");
    if (thumb) {
      selectGalleryImage(content, thumb);
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });

  content.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const thumb = event.target.closest("[data-gallery-index]");
    if (!thumb) return;

    event.preventDefault();
    selectGalleryImage(content, thumb);
  });
}

function setupImageModal() {
  const modal = document.getElementById("imageModal");
  const close = document.getElementById("closeImageModal");
  if (!modal) return;

  if (close) {
    close.addEventListener("click", () => modal.close());
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
}

function openImageModal(image) {
  const modal = document.getElementById("imageModal");
  const photo = document.getElementById("imageModalPhoto");
  if (!modal || !photo || !isImageSource(image)) return;

  photo.src = image;
  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "");
  }
}

function setupFooterYear() {
  const year = document.getElementById("copyrightYear");
  if (year) year.textContent = String(new Date().getFullYear());
}

function selectGalleryImage(content, thumb) {
  const main = content.querySelector("[data-gallery-main]");
  if (!main) return;

  let images = [];
  try {
    images = JSON.parse(content.dataset.gallery || "[]");
  } catch (error) {
    images = [];
  }

  const index = Number(thumb.dataset.galleryIndex || 0);
  const image = images[index] || "";
  const title = content.dataset.landTitle || "Terreno";

  main.innerHTML = image
    ? `<img src="${image}" alt="Imagen de ${escapeHtml(title)}" />`
    : placeholderLandSvg(title);

  content.querySelectorAll("[data-gallery-index]").forEach((item) => item.classList.remove("is-active"));
  thumb.classList.add("is-active");
}

function setupLogin() {
  const button = document.getElementById("loginButton");
  const modal = document.getElementById("loginModal");
  const form = document.getElementById("loginForm");
  const close = document.getElementById("closeLogin");
  const note = document.getElementById("loginNote");

  if (!button || !modal || !form) return;

  button.addEventListener("click", async () => {
    if (isAdminLoggedIn()) {
      setToken("");
      resetLandForm();
      await updateAdminUi();
      return;
    }

    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  });

  if (close) {
    close.addEventListener("click", () => modal.close());
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = new FormData(form).get("password");

    try {
      await loginAdmin(password);
      form.reset();
      if (note) note.textContent = "";
      modal.close();
      await updateAdminUi();
      document.getElementById("terrenos")?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      if (note) note.textContent = error.message || "No se pudo iniciar sesion.";
    }
  });
}

function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupForm() {
  const form = document.getElementById("leadForm");
  const note = document.getElementById("formNote");
  if (!form || !note) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const detail = String(data.get("message") || "").trim() || "Dame más info";
    const client = {
      name: data.get("name"),
      phone: data.get("phone"),
      topic: data.get("topic"),
      message: detail,
      source: "Formulario de contacto",
    };
    const message = [
      "Hola Agustina, quiero consultar por Lead Brokers.",
      `Nombre: ${client.name}`,
      `Motivo: ${client.topic}`,
      `Detalle: ${detail}`,
    ].join("\n");
    const whatsappLink = whatsappUrl(message);

    try {
      await saveClient(client);
      note.innerHTML = `
        <span>Consulta registrada. Podés enviar WhatsApp ahora o quedar en espera.</span>
        <span class="form-note-actions">
          <a class="btn primary" href="${whatsappLink}" target="_blank" rel="noopener">Enviar WhatsApp</a>
          <button class="btn ghost" type="button" data-wait-contact>Quedar en espera</button>
        </span>
      `;
      await renderClients();
    } catch (error) {
      note.innerHTML = `
        <span>No se pudo registrar en la base. Igual podés enviar WhatsApp.</span>
        <span class="form-note-actions">
          <a class="btn primary" href="${whatsappLink}" target="_blank" rel="noopener">Enviar WhatsApp</a>
        </span>
      `;
    }
  });

  note.addEventListener("click", (event) => {
    if (!event.target.closest("[data-wait-contact]")) return;

    note.textContent = "Perfecto, quedaste registrado. Agustina te contacta cuando pueda.";
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setWhatsappLinks();
  setupFooterYear();
  renderProperties();
  setupNavigation();
  setupForm();
  setupLogin();
  setupLandManager();
  setupLandDetailModal();
  setupImageModal();
  await updateAdminUi();
  openLandFromHash();

  const filter = document.getElementById("propertyFilter");
  if (filter) {
    filter.addEventListener("change", (event) => renderProperties(event.target.value));
  }
});

window.addEventListener("hashchange", openLandFromHash);
