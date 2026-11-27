const BASE = "https://tenders.go.ke/api/active-tenders";
const FRESH_CACHE_MS = 5 * 60 * 1000;
const CACHE_TTL_SECONDS = 24 * 60 * 60;

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};

const first = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

function safeSource(value, id) {
  try {
    const fallback = id ? "/tenders/" + encodeURIComponent(id) : "/tenders/";
    const url = new URL(value || fallback, "https://tenders.go.ke");
    return url.protocol === "https:" && url.hostname === "tenders.go.ke"
      ? url.href
      : "https://tenders.go.ke/tenders/";
  } catch {
    return "https://tenders.go.ke/tenders/";
  }
}

function normalize(row) {
  const id = String(first(row.id, row.sourceId, row.tender_id, "") || "");
  const groups = Array.isArray(row.agpo_groups) ? row.agpo_groups : [];
  const bidderCategories = Array.isArray(row.bidder_categories) ? row.bidder_categories : [];
  const agpo = groups.length > 0 ||
    bidderCategories.some((item) => String(item?.code || "").toLowerCase() === "agpo");

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

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { ...securityHeaders, ...headers }
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, { allow: "GET", "cache-control": "no-store" });
  }

  const requestedPage = Number(url.searchParams.get("page") || "1");
  const page = Number.isFinite(requestedPage)
    ? Math.max(1, Math.min(100, Math.floor(requestedPage)))
    : 1;
  const cacheKey = "tenders-page-" + page;

  let cached = null;
  try {
    if (env.PPIP_CACHE) cached = await env.PPIP_CACHE.get(cacheKey, "json");
  } catch {
    cached = null;
  }

  const cachedAt = cached?.fetched_at || cached?.updated_at || null;
  const cacheAge = cachedAt ? Date.now() - new Date(cachedAt).getTime() : Infinity;
  const hasCache = Boolean(cached && Array.isArray(cached.notices));

  if (hasCache && cacheAge >= 0 && cacheAge < FRESH_CACHE_MS) {
    return json({ ...cached, stale: false, cache_status: "fresh-cache" }, 200, {
      "cache-control": "public, max-age=60, s-maxage=120",
      "x-bidwazi-cache": "fresh"
    });
  }

  const upstream = new URL(BASE);
  upstream.searchParams.set("page", String(page));
  let failureReason = "The official PPIP feed is temporarily unavailable.";
  let failureStatus = 503;

  try {
    const response = await fetch(upstream, {
      headers: {
        accept: "application/json",
        "user-agent": "BidWaziAfrica/1.0 (+https://bidwazi-africa.pages.dev)"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      failureReason = "Official PPIP source returned HTTP " + response.status;
      failureStatus = 502;
    } else {
      const body = await response.json();
      if (!Array.isArray(body?.data)) {
        failureReason = "PPIP response format changed; use the official portal while we update the connector.";
        failureStatus = 502;
      } else {
        const notices = body.data.map(normalize).filter((item) => item.id && item.title);
        const fetchedAt = new Date().toISOString();
        const payload = {
          source: "Kenya PPIP",
          page: Number(body.current_page || page),
          last_page: Number(body.last_page || 1),
          total: Number(body.total || notices.length),
          per_page: Number(body.per_page || notices.length),
          notices,
          updated_at: fetchedAt,
          fetched_at: fetchedAt,
          stale: false
        };

        try {
          if (env.PPIP_CACHE) {
            await env.PPIP_CACHE.put(cacheKey, JSON.stringify(payload), {
              expirationTtl: CACHE_TTL_SECONDS
            });
          }
        } catch {
          // The live response remains usable if cache storage is temporarily unavailable.
        }

        return json(payload, 200, {
          "cache-control": "public, max-age=60, s-maxage=120",
          "x-bidwazi-cache": "origin"
        });
      }
    }
  } catch {
    failureReason = "Unable to reach the public procurement feed.";
    failureStatus = 503;
  }

  if (hasCache) {
    const stalePayload = {
      ...cached,
      stale: true,
      stale_reason: failureReason,
      stale_served_at: new Date().toISOString()
    };
    return json(stalePayload, 200, {
      "cache-control": "no-store",
      "x-bidwazi-stale": "1"
    });
  }

  return json({ error: failureReason }, failureStatus, { "cache-control": "no-store" });
}
