import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SummaryPayload = {
  totalProperties: number;
  newCount?: number;
  usedCount?: number;
  newAvgPrice?: number;
  newAvgPricePerM2?: number;
  usedAvgPrice?: number;
  usedAvgPricePerM2?: number;
  colonyDistribution?: { name: string; count: number; percentage: number }[];
};

function buildFallbackInsights(summary: SummaryPayload): string[] {
  const insights: string[] = [];

  if ((summary.newCount ?? 0) > 0 && (summary.usedCount ?? 0) > 0 && (summary.usedAvgPrice ?? 0) > 0) {
    const diff = ((((summary.newAvgPrice ?? 0) - (summary.usedAvgPrice ?? 0)) / (summary.usedAvgPrice ?? 1)) * 100).toFixed(1);
    insights.push(`El producto nuevo tiene una prima aproximada del ${diff}% sobre el usado.`);
  }

  const topColony = summary.colonyDistribution?.[0];
  if (topColony) {
    insights.push(`La colonia con mayor oferta es "${topColony.name}" con ${topColony.percentage}% del inventario analizado.`);
  }

  if ((summary.newAvgPricePerM2 ?? 0) > 0) {
    insights.push(`El precio promedio por m² en producto nuevo ronda $${Math.round(summary.newAvgPricePerM2 ?? 0).toLocaleString('es-MX')}.`);
  }

  if ((summary.usedAvgPricePerM2 ?? 0) > 0) {
    insights.push(`El precio promedio por m² en producto usado ronda $${Math.round(summary.usedAvgPricePerM2 ?? 0).toLocaleString('es-MX')}.`);
  }

  insights.push(`Se procesaron ${summary.totalProperties} propiedades en el análisis final.`);

  return insights.slice(0, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const summary: SummaryPayload = body?.summary ?? {
      totalProperties: Array.isArray(body?.properties) ? body.properties.length : 0,
      colonyDistribution: [],
    };

    if (!summary.totalProperties) {
      return new Response(JSON.stringify({ error: "No se recibieron propiedades para analizar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If key is missing, avoid 500 and return deterministic insights
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ insights: buildFallbackInsights(summary), mode: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un analista inmobiliario senior. Recibirás un resumen numérico de mercado.
Devuelve SOLO JSON válido con esta estructura exacta:
{"insights":["string","string"]}
Reglas:
- Máximo 6 insights
- Español ejecutivo
- Sin markdown
- No inventes datos fuera del resumen`;

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
          { role: "user", content: `Resumen del mercado:\n${JSON.stringify(summary)}` },
        ],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ insights: buildFallbackInsights(summary), mode: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const cleaned = String(content ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    if (!cleaned) {
      return new Response(JSON.stringify({ insights: buildFallbackInsights(summary), mode: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(cleaned);
    const insights = Array.isArray(parsed?.insights) ? parsed.insights.filter((i: unknown) => typeof i === "string").slice(0, 6) : [];

    return new Response(JSON.stringify({ insights: insights.length ? insights : buildFallbackInsights(summary), mode: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-properties error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
