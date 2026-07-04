# RetroFit Advisor — React MVP Prototype

Same 4-screen demo as `prototype.html`, rebuilt as a real React app (Vite) so it can drop straight into the team's actual frontend codebase.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## What's inside

- `src/App.jsx` — the 4 screens (Landing, Confirm + Questions, Loading, Results) and all state (temperature, selected room, loading progress).
- `src/House3D.jsx` — the interactive 3D Victorian house on the landing screen (plain `three.js`, no external model). Tap/click one of the 4 orange points to see which product feature it maps to. No rotation or drag — it just floats gently in place.
- `src/index.css` — brand styles (colors, pills, tags) shared across the app.
- Icons come from `lucide-react`; Tailwind is loaded via CDN in `index.html` for simplicity (no PostCSS config needed).

## Notes

- The house needs WebGL and, since Tailwind is loaded from a CDN, an internet connection — test on the venue wifi beforehand.
- This is still a demo/prototype: no real API calls, all data is hardcoded to make the flow feel real.
