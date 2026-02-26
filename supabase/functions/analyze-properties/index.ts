import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { properties } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un analista inmobiliario experto. Recibirás un array JSON de propiedades. Cada propiedad tiene: price, pricePerM2, area, colony, type ("new"/"used"/"nuevo"/"usado"), source.

Tu trabajo:
1. Clasifica cada propiedad como "new" o "used" según el campo "type" (si dice "nuevo" → "new", si dice "usado" → "used").
2. Para cada grupo (new/used), calcula:
   - Precio promedio (aplicando media truncada: elimina el 10% más caro y el 10% más barato)
   - Precio promedio por m² (misma media truncada)
   - Regla 60/40: 60% del precio promedio = valor construcción, 40% = valor terreno
3. Calcula la distribución por colonias (nombre, cantidad, porcentaje).
4. Genera un array de "insights" (máximo 6) que incluya:
   - Prima porcentual del producto nuevo vs usado
   - Colonia con mayor oferta
   - Comparación del precio por m² de cada propiedad contra el promedio general del dataset
   - Cualquier outlier o patrón relevante

Responde SOLO con JSON válido usando esta estructura exacta (sin markdown, sin texto extra):
{
  "newProducts": [...],
  "usedProducts": [...],
  "newAvgPrice": number,
  "newAvgPricePerM2": number,
  "usedAvgPrice": number,
  "usedAvgPricePerM2": number,
  "newConstruction60": number,
  "newTerrain40": number,
  "usedConstruction60": number,
  "usedTerrain40": number,
  "colonyDistribution": [{"name": string, "count": number, "percentage": number}],
  "insights": [string],
  "totalProperties": number,
  "trimmedProperties": number
}

Donde newProducts y usedProducts son los arrays de propiedades ya clasificadas con los campos: price, pricePerM2, area, colony, type, source.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza estas propiedades:\n${JSON.stringify(properties)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos a tu workspace de Lovable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error en el gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Respuesta vacía del modelo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean potential markdown fences
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-properties error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
