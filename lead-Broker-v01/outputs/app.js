const phoneNumber = "59892420997";
const baseMessage = "Hola Agustina, quiero consultar por Lead Brokers.";
const landsStorageKey = "lead-brokers-lands-fallback";
const adminTokenKey = "lead-brokers-admin-token";
const fallbackPassword = "agustina2026";

let apiOnline = true;
let landsCache = [];

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
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Error de servidor");
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

function landImages(land) {
  const gallery = Array.isArray(land.gallery) ? land.gallery : [];
  return [land.image, ...gallery].filter(Boolean);
}

function galleryItem(image, land, className, index = 0) {
  const isThumb = className.includes("thumb");
  const attributes = isThumb
    ? `role="button" tabindex="0" data-gallery-index="${index}"`
    : `data-gallery-main`;
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
  ].join("\n");

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
        <a class="btn primary" href="${whatsappUrl(message)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
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
      ].join("\n");

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
              <button class="edit-land ${admin ? "" : "is-hidden"}" type="button" data-land-id="${escapeHtml(land.id)}">Editar</button>
              <button class="delete-land ${admin ? "" : "is-hidden"}" type="button" data-land-id="${escapeHtml(land.id)}">Borrar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
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
}

function resetLandForm() {
  const form = document.getElementById("landForm");
  const title = document.getElementById("landFormTitle");
  const note = document.getElementById("landNote");
  const submitButton = document.getElementById("landSubmitButton");
  const galleryCount = document.getElementById("galleryCount");
  if (!form) return;

  form.reset();
  form.elements.landId.value = "";
  if (form.elements.priceCurrency) form.elements.priceCurrency.value = "USD";
  updatePricePreview();
  if (title) title.textContent = "Subir nuevo terreno";
  if (submitButton) submitButton.textContent = "Publicar terreno";
  if (note) note.textContent = "";
  if (galleryCount) galleryCount.textContent = "Podés elegir varias fotos juntas desde tu PC.";
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

async function filesToDataUrls(files) {
  return Promise.all(Array.from(files || []).map((file) => fileToDataUrl(file)));
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
      form.elements.size.value = formatSize(parseSize(land.size));
      form.elements.description.value = land.description;
      form.elements.longDescription.value = land.long_description || land.longDescription || "";
      form.elements.sellerName.value = land.seller_name || land.sellerName || "";
      form.elements.sellerPhone.value = land.seller_phone || land.sellerPhone || "";
      form.elements.sellerDescription.value = land.seller_description || land.sellerDescription || "";
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
      const currentGallery = Array.isArray(currentLand?.gallery) ? currentLand.gallery : [];
      const currency = data.get("priceCurrency");
      const amount = onlyDigits(data.get("priceAmount"));

      await saveLand({
        id: editingId || undefined,
        title: data.get("title"),
        price: formatPrice(currency, amount),
        location: data.get("location"),
        size: formatSize(data.get("size")),
        description: data.get("description"),
        long_description: data.get("longDescription"),
        seller_name: data.get("sellerName"),
        seller_phone: data.get("sellerPhone"),
        seller_description: data.get("sellerDescription"),
        gallery: gallery.length ? [...currentGallery, ...gallery] : currentGallery,
        image: image || currentLand?.image || gallery[0] || "",
      });

      resetLandForm();
      form.classList.add("is-hidden");
      await renderLands();
      if (note) note.textContent = editingId ? "Terreno actualizado en la base de datos." : "Terreno publicado en la base de datos.";
    } catch (error) {
      if (note) {
        note.textContent = `No se pudo guardar: ${error.message}. Si agregaste la ficha ampliada, ejecuta el SQL actualizado en Supabase.`;
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function setupLandDetailModal() {
  const modal = document.getElementById("landDetailModal");
  const content = document.getElementById("landDetailContent");
  if (!modal || !content) return;

  content.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-detail]")) {
      modal.close();
      return;
    }

    const thumb = event.target.closest("[data-gallery-index]");
    if (thumb) {
      selectGalleryImage(content, thumb);
    }
  });

  content.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const thumb = event.target.closest("[data-gallery-index]");
    if (!thumb) return;

    event.preventDefault();
    selectGalleryImage(content, thumb);
  });
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const message = [
      "Hola Agustina, quiero consultar por Lead Brokers.",
      `Nombre: ${data.get("name")}`,
      `Telefono: ${data.get("phone")}`,
      `Consulta: ${data.get("topic")}`,
      `Detalle: ${data.get("message")}`,
    ].join("\n");

    note.textContent = "Mensaje listo. Se abrira WhatsApp para enviarlo.";
    window.open(whatsappUrl(message), "_blank", "noopener");
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
  await updateAdminUi();

  const filter = document.getElementById("propertyFilter");
  if (filter) {
    filter.addEventListener("change", (event) => renderProperties(event.target.value));
  }
});
