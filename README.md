# londonmaxxing

UK energy performance certificate lookup built with Vite, React, and Tailwind CSS.

## Setup

```bash
npm install
cp .bearer-token.example .bearer-token
```

Add your bearer token to `.bearer-token` (one line, no quotes). The dev server proxy reads this file so the token is not exposed in the browser.

Alternatively, set `EPC_BEARER_TOKEN` in a `.env` file.   

To use the "Generate insight" feature (AI summary comparing your EPC data with your
personalized bill estimate, powered by Claude Sonnet 5 via OpenRouter), also set
`OPENROUTER_API_KEY` in your `.env` file. Get a key at https://openrouter.ai/keys.

## Development

```bash
npm run dev
```

Open the app, enter a UK postcode (e.g. `SW19 7LE`), and choose a property from the results.

## Build

```bash
npm run build
npm run preview
```

## Deploy

### Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. Add environment variables:
   - **Name:** `EPC_BEARER_TOKEN` — **Value:** your EPC bearer token
   - **Name:** `OPENROUTER_API_KEY` — **Value:** your OpenRouter API key (for the "Generate insight" feature)
   - **Environments:** Production, Preview, Development
3. Deploy. The app calls `/api/epc/...` (handled by `api/epc/[...path].js`) and `/api/insight` (handled by `api/insight.js`), both of which add the relevant secret server-side.

For a demo where you do not mind the token being visible in the client bundle, you can use `VITE_EPC_BEARER_TOKEN` instead — the API route accepts either variable.

Local dev still uses `.bearer-token` or `EPC_BEARER_TOKEN` in `.env` via the Vite dev proxy.

### Cloudflare Pages

Deploys the `dist` folder to Cloudflare Pages via Wrangler (run `npx wrangler login` once first, and `npm run build` beforehand if deploying locally rather than from Cloudflare's own build step):

```bash
npm run deploy
```

Note: the Cloudflare Pages deploy is static only — API proxying requires a separate worker or calling the EPC API directly from the client.



