// Workday bus relay — a free Cloudflare Worker.
// The app on your phone can't read bustimes.org directly (browsers block it),
// so this worker fetches the data and hands it back with the right headers.
//
// Routes:
//   /departures?stop=0100BRP92066   -> next departures at a stop (scraped from bustimes.org)
//   /vehicles?xmin=&ymin=&xmax=&ymax= -> live bus positions in a box (bustimes.org vehicles feed)

const UA = "WorkdayBusRelay/1.0 (personal use)";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=20",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/departures") {
        const stop = (url.searchParams.get("stop") || "").replace(/[^0-9A-Za-z]/g, "");
        if (!stop) return json({ error: "Add ?stop=ATCO_CODE" }, 400, cors);
        const [deps, info] = await Promise.all([departures(stop), stopInfo(stop)]);
        return json({ stop, ...info, departures: deps, fetched: new Date().toISOString() }, 200, cors);
      }
      if (url.pathname === "/vehicles") {
        const q = ["xmin", "ymin", "xmax", "ymax"].map(k => `${k}=${encodeURIComponent(url.searchParams.get(k) || "")}`).join("&");
        const r = await fetch(`https://bustimes.org/vehicles.json?${q}`, { headers: { "User-Agent": UA } });
        if (!r.ok) return json({ error: `bustimes vehicles ${r.status}` }, 502, cors);
        const raw = await r.json();
        const list = (Array.isArray(raw) ? raw : raw.results || []).map(v => ({
          id: v.id ?? v.vehicle?.slug ?? v.vehicle?.id ?? null,
          lat: v.coordinates?.[1] ?? v.latitude ?? null,
          lng: v.coordinates?.[0] ?? v.longitude ?? null,
          heading: v.heading ?? null,
          service: String(v.service?.line_name ?? v.line_name ?? v.service ?? "").trim(),
          destination: v.destination ?? "",
          when: v.datetime ?? null,
        })).filter(v => v.lat != null && v.lng != null);
        return json({ vehicles: list, fetched: new Date().toISOString() }, 200, cors);
      }
      return json({ ok: true, routes: ["/departures?stop=", "/vehicles?xmin&ymin&xmax&ymax"] }, 200, cors);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, cors);
    }
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

const strip = s => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function departures(stop) {
  const r = await fetch(`https://bustimes.org/stops/${stop}`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`bustimes stop page ${r.status}`);
  const html = await r.text();
  const out = [];
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    if (cells.length < 2) continue;
    const text = cells.map(strip);
    const times = text.join(" ").match(/\b\d{1,2}:\d{2}\b/g) || [];
    if (!times.length) continue;
    const vehicle = (row[1].match(/href="\/vehicles\/([^"#?]+)/) || [])[1] || null;
    out.push({
      service: text[0],
      destination: text[1],
      scheduled: times[0],
      expected: times[1] || null,
      vehicle,
    });
    if (out.length >= 15) break;
  }
  return out;
}

async function stopInfo(stop) {
  try {
    const r = await fetch(`https://bustimes.org/api/stops/?atco_code=${stop}`, { headers: { "User-Agent": UA } });
    if (!r.ok) return {};
    const d = await r.json();
    const s = (d.results || [])[0];
    if (!s) return {};
    return { name: s.long_name || s.common_name || s.name, lat: s.location?.[1], lng: s.location?.[0] };
  } catch { return {}; }
}
