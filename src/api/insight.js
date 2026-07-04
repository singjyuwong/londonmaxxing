import { formatCertificateAddress } from "./epc";

const INSIGHT_API_URL = "/api/insight";

function currency(value) {
  if (value == null) return "n/a";
  return `£${Number(value).toFixed(2)}`;
}

function buildPrompt({ certificate, billBreakdown, factors }) {
  const address = formatCertificateAddress(certificate);

  const epcSummary = `
Address: ${address || "n/a"}
Dwelling type: ${certificate.dwelling_type ?? "n/a"}
Total floor area: ${certificate.total_floor_area ?? "n/a"} m²
Current energy rating: ${certificate.energy_rating_current ?? "n/a"}/100 (band ${certificate.current_energy_efficiency_band ?? "n/a"})
Potential energy rating: ${certificate.energy_rating_potential ?? "n/a"}/100 (band ${certificate.potential_energy_efficiency_band ?? "n/a"})
Heating cost (current, per EPC): ${currency(certificate.heating_cost_current?.value)}
Hot water cost (current, per EPC): ${currency(certificate.hot_water_cost_current?.value)}
Lighting cost (current, per EPC): ${currency(certificate.lighting_cost_current?.value)}
Heating cost (potential, per EPC): ${currency(certificate.heating_cost_potential?.value)}
Hot water cost (potential, per EPC): ${currency(certificate.hot_water_cost_potential?.value)}
Lighting cost (potential, per EPC): ${currency(certificate.lighting_cost_potential?.value)}
CO2 emissions (current): ${certificate.co2_emissions_current?.value ?? "n/a"} tonnes/year
CO2 emissions (potential): ${certificate.co2_emissions_potential?.value ?? "n/a"} tonnes/year
`.trim();

  const improvements = (certificate.suggested_improvements ?? [])
    .slice(0, 5)
    .map((item) => {
      const cost = item.indicative_cost
        ? ` (cost: ${item.indicative_cost})`
        : "";
      const saving = item.typical_saving?.value
        ? `, typical saving ${currency(item.typical_saving.value)}/yr`
        : "";
      return `- ${item.improvement_type}${cost}${saving}`;
    })
    .join("\n");

  const factorsSummary = factors
    ? Object.entries(factors)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join("\n")
    : "n/a";

  const billSummary = billBreakdown
    ? `
Personalized bill estimate (based on household lifestyle factors):
- Heating: ${currency(billBreakdown.heating)} (EPC baseline: ${currency(certificate.heating_cost_current?.value)})
- Hot water: ${currency(billBreakdown.hotWater)} (EPC baseline: ${currency(certificate.hot_water_cost_current?.value)})
- Lighting: ${currency(billBreakdown.lighting)} (EPC baseline: ${currency(certificate.lighting_cost_current?.value)})
- Total: ${currency(billBreakdown.total)}
`.trim()
    : "n/a";

  return `
Here is data for a UK residential property from the government's Energy Performance Certificate (EPC) database, along with a personalized bill estimate computed from household lifestyle factors.

## EPC data
${epcSummary}

## Suggested improvements (from EPC)
${improvements || "None listed."}

## Household lifestyle factors used for personalization
${factorsSummary}

## Personalized bill estimate vs EPC baseline
${billSummary}

Please summarize the above, compare the personalized estimate against the raw EPC baseline (explain why they differ), and provide 3-5 concrete, prioritized, and specific recommendations for reducing this household's energy costs. Keep it focused and actionable.
`.trim();
}

export async function generateInsight({ certificate, billBreakdown, factors }) {
  const prompt = buildPrompt({ certificate, billBreakdown, factors });

  const response = await fetch(INSIGHT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // fall back to raw text below
  }

  if (!response.ok) {
    const raw = body?.error;
    const fallback = text || `Request failed (${response.status})`;
    const message = typeof raw === "string" ? raw : (raw?.message ?? fallback);
    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No insight returned.");
  }

  return content;
}
