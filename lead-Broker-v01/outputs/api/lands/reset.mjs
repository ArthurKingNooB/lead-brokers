import { json, requireAdmin, supabase } from "../_supabase.mjs";

const defaultLands = [
  {
    title: "Terreno urbano con servicios",
    price: "USD 32.000",
    location: "Zona residencial",
    size: "420 m2",
    description: "Lote parejo, buen acceso, luz y agua disponibles. Ideal para vivienda o inversion.",
    image: "",
  },
  {
    title: "Lote amplio para desarrollo",
    price: "USD 58.000",
    location: "A metros de ruta principal",
    size: "900 m2",
    description: "Excelente frente, entorno en crecimiento y potencial para proyecto comercial.",
    image: "",
  },
  {
    title: "Terreno listo para escriturar",
    price: "Consultar",
    location: "Barrio tranquilo",
    size: "510 m2",
    description: "Documentacion ordenada, zona con buena demanda y consultas activas.",
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
