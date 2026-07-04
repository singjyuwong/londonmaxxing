# londonmaxxing

UK energy performance certificate lookup built with Vite, React, and Tailwind CSS.

## Setup

```bash
npm install
cp .bearer-token.example .bearer-token
```

Add your bearer token to `.bearer-token` (one line, no quotes). The dev server proxy reads this file so the token is not exposed in the browser.

Alternatively, set `EPC_BEARER_TOKEN` in a `.env` file.  

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

Deploys the `dist` folder to Cloudflare Pages via Wrangler (run `npx wrangler login` once first, and `npm run build` beforehand if deploying locally rather than from Cloudflare's own build step):

```bash
npm run deploy
```


