import { json, requireAdmin, supabase } from "../_supabase.mjs";

const defaultLands = [
  {
    title: "Terreno urbano con servicios",
    status: "available",
    price: "USD 32.000",
    location: "Zona residencial",
    map_url: "",
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
    title: "Lote amplio para desarrollo",
    status: "available",
    price: "USD 58.000",
    location: "A metros de ruta principal",
    map_url: "",
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
    title: "Terreno listo para escriturar",
    status: "available",
    price: "Consultar",
    location: "Barrio tranquilo",
    map_url: "",
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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      json(res, 405, { error: "Metodo no permitido." });
      return;
    }

    if (!requireAdmin(req, res)) return;

    await supabase("/lands?id=not.is.null", { method: "DELETE" });
    await supabase("/lands", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(defaultLands),
    });

    const lands = await supabase("/lands?select=*&order=created_at.desc");
    json(res, 200, { lands });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno." });
  }
}
