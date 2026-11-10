# Workday app — setup

Two files:

- `index.html` — the app itself (map, buses, weather, work log). Runs in your phone's browser.
- `worker.js` — a tiny free "bus relay". bustimes.org doesn't let browsers read its live times directly, so this relays them.

Weather (Open-Meteo) and the map (OpenStreetMap) need no keys and work straight away.

## 1. Put the app online (GitHub Pages, free, ~5 min)

Location only works on an `https://` address, so opening the file from your phone's downloads won't find you.

1. On github.com create a new public repository, e.g. `workday`.
2. Upload `index.html` (Add file → Upload files → Commit).
3. Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)` → Save.
4. After a minute your app is at `https://<your-username>.github.io/workday/`.
5. On your phone open it, allow location, then Share → **Add to Home Screen** so it opens like an app.

## 2. Turn on live buses (Cloudflare Worker, free, ~5 min)

1. Sign up at dash.cloudflare.com (free plan).
2. Workers & Pages → Create → Create Worker → name it `workday-bus` → Deploy.
3. Edit code → delete the sample → paste all of `worker.js` → Deploy.
4. Copy its address, e.g. `https://workday-bus.<you>.workers.dev`.
5. Check it: open `…workers.dev/departures?stop=0100BRP92066` — you should see JSON with times.
6. In the app: Settings → Bus relay address → paste → Done.

Until then the bus panel shows clearly labelled sample times.

## Live buses on the map (government feed)

1. Register free at https://data.bus-data.dft.gov.uk/account/signup/ (choose the data consumer / "I want to use data" option).
2. After confirming your email, open your account → **API key**, and copy it.
3. In the app: Settings → **Bus Open Data key** → paste → Done.

The app asks the government feed directly. If your phone's browser blocks that, the map says so, and the bus relay (below) passes it through instead. The key is stored only on your phone, never in this repository.

## How it decides what to show

| You're nearest to | Stop used | Shows |
|---|---|---|
| Dorset Road | Henleaze Dorset Road, south-bound (0100BRP92066) | Next 3 arrivals (2, 2a, Y6) + those buses on the map heading to it |
| Rupert Street | Stop B6 (0100BRA16911) | Next departures of 1, 2, 2a, Y6 (north-bound) |
| The Centre | Stop C7 (0100BRP90371) | Next departures of 1, 2, 2a, Y6 (north-bound) |
| College Green | Stop P1 (0100BRP90327) | Next departures of 1, 2, 2a, Y6 (north-bound) |

Heading north, all four routes call at Rupert Street (B6), then The Centre (C7), then College Green (P1). The Y6 starts at Rupert Street.

## Work log

- Tap **Start** to begin logging, **Stop** to end. Sessions over midnight are split across days.
- The week chart runs Monday–Sunday; ‹ › moves between weeks. Optional weekly target in Settings (dashed line = target ÷ 5 per day).
- Data lives on your phone in the browser. Use **Back up log** now and then; **Restore backup** brings it back.

## Weather

The map overlay is a 5×5 grid of Open-Meteo forecasts covering whatever area the map shows, so the overlay and the chart use the same data. Slider: −3 h to +12 h. Rain chip = rainfall shading; Weather chip = symbols, colour and °C labels; Isobars chip = pressure lines and H/L centres.

## Later: Google Health

Not wired in yet. When you're ready, the plan is a "Health" row under the week chart (steps, sleep) fed from Google Health Connect / Fitbit data.
