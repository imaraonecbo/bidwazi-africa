const BASE = "https://tenders.go.ke/api/active-tenders";
const safeSource = (value, id) => {
  try {
    const url = new URL(value || (id ? "/tenders/" + encodeURIComponent(id) : "/tenders/"), "https://tenders.go.ke");
    return url.protocol === "https:" && url.hostname === "tenders.go.ke" ? url.href : "https://tenders.go.ke/tenders/";
  } catch { return "https://tenders.go.ke/tenders/"; }
};
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== "");
function normalize(row) {
  const id = String(first(row.id, row.sourceId, row.tender_id, ""));
  const groups = Array.isArray(row.agpo_groups) ? row.agpo_groups : [];
  const bidderCategories = Array.isArray(row.bidder_categories) ? row.bidder_categories : [];
  const agpo = groups.length > 0 || bidderCategories.some(item => String(item.code || "").toLowerCase() === "agpo");
  return {
    id,
    title: String(first(row.title, row.description, "Untitled notice")).slice(0, 500),
    reference: String(first(row.tender_ref, row.tender_no, row.reference, "")).slice(0, 160),
    entity: String(first(row.pe?.name, row.procuring_entity, row.buyer?.name, "")).slice(0, 240),
    category: String(first(row.procurement_category?.title, row.procurement_category, row.category, "")).slice(0, 100),
    method: String(first(row.procurement_method?.title, row.procurement_method, row.method, "")).slice(0, 100),
    closing: String(first(row.close_at, row.closing_date, row.close_date, row.deadline, "")),
    published: String(first(row.published_at, row.published_date, row.created_at, "")),
    agpo,
    sourceUrl: safeSource(first(row.url, row.source_url), id)
  };
}
export async function onRequest({ request }) {
  const url = new URL(request.url);
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { allow: "GET" } });
  const page = Math.max(1, Math.min(100, Number(url.searchParams.get("page") || 1)));
  const upstream = new URL(BASE);
  upstream.searchParams.set("page", String(page));
  try {
    const response = await fetch(upstream, {
      headers: { accept: "application/json", "user-agent": "BidWaziAfrica/1.0" },
      cf: { cacheTtl: 120, cacheEverything: true }
    });
    if (!response.ok) return Response.json({ error: "Official PPIP source returned HTTP " + response.status }, { status: 502 });
    const body = await response.json();
    if (!Array.isArray(body.data)) return Response.json({ error: "PPIP response format changed; use the official portal while we update the connector." }, { status: 502 });
    const notices = body.data.map(normalize).filter(item => item.id && item.title);
    return Response.json({
      source: "Kenya PPIP",
      page: Number(body.current_page || page),
      last_page: Number(body.last_page || 1),
      total: Number(body.total || notices.length),
      per_page: Number(body.per_page || notices.length),
      notices,
      updated_at: new Date().toISOString()
    }, { headers: { "cache-control": "public, max-age=60, s-maxage=120", "x-content-type-options": "nosniff" } });
  } catch {
    return Response.json({ error: "Unable to reach the public procurement feed. Try again shortly or open tenders.go.ke directly." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
