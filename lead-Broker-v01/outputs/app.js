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
  if (land.image) {
    return `<img src="${land.image}" alt="Imagen de ${escapeHtml(land.title)}" />`;
  }

  return placeholderLandSvg(land.title);
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
              <a class="btn primary" href="${whatsappUrl(message)}" target="_blank" rel="noopener">Consultar compra</a>
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
  if (!form) return;

  form.reset();
  form.elements.landId.value = "";
  if (form.elements.priceCurrency) form.elements.priceCurrency.value = "USD";
  updatePricePreview();
  if (title) title.textContent = "Subir nuevo terreno";
  if (note) note.textContent = "";
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

  if (!form || !toggle || !list) return;

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
    cancelEdit.addEventListener("click", resetLandForm);
  }

  list.addEventListener("click", async (event) => {
    if (!isAdminLoggedIn()) return;

    const editButton = event.target.closest(".edit-land");
    const deleteButton = event.target.closest(".delete-land");

    if (editButton) {
      const land = landsCache.find((item) => item.id === editButton.dataset.landId);
      const title = document.getElementById("landFormTitle");
      if (!land) return;

      form.classList.remove("is-hidden");
      const parsedPrice = parsePrice(land.price);
      form.elements.landId.value = land.id;
      form.elements.title.value = land.title;
      form.elements.priceCurrency.value = land.priceCurrency || parsedPrice.currency;
      form.elements.priceAmount.value = formatThousands(land.priceAmount || parsedPrice.amount);
      form.elements.location.value = land.location;
      form.elements.size.value = land.size;
      form.elements.description.value = land.description;
      updatePricePreview();
      if (title) title.textContent = "Editar terreno";
      if (note) note.textContent = "Editando terreno. La imagen solo cambia si subis una nueva.";
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

    const data = new FormData(form);
    const image = await fileToDataUrl(data.get("image"));
    const editingId = data.get("landId");
    const currentLand = landsCache.find((land) => land.id === editingId);
    const currency = data.get("priceCurrency");
    const amount = onlyDigits(data.get("priceAmount"));

    await saveLand({
      id: editingId || undefined,
      title: data.get("title"),
      price: formatPrice(currency, amount),
      location: data.get("location"),
      size: data.get("size"),
      description: data.get("description"),
      image: image || currentLand?.image || "",
    });

    resetLandForm();
    await renderLands();
    if (note) note.textContent = editingId ? "Terreno actualizado en la base de datos." : "Terreno publicado en la base de datos.";
  });
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
  renderProperties();
  setupNavigation();
  setupForm();
  setupLogin();
  setupLandManager();
  await updateAdminUi();

  const filter = document.getElementById("propertyFilter");
  if (filter) {
    filter.addEventListener("change", (event) => renderProperties(event.target.value));
  }
});
