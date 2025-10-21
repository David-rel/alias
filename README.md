## Alias

AI-connected operating system for modern small businesses. The app unifies websites, payroll, marketing automation, and MCP-driven workflows under a single control center.

## Branding Palette

| Mode       | Hex      | Notes                               |
|------------|----------|-------------------------------------|
| Dark base  | `#03162d`| Primary dark background             |
| Light base | `#ffffff`| Primary light background            |
| Core 01    | `#0064d6`| Deep Alias blue                     |
| Core 02    | `#23a5fe`| Accent blue for calls to action     |
| Core 03    | `#3eb6fd`| Supporting gradient layer           |
| Support    | `#000000`/`#ffffff` | Text and inverse surfaces |

Future UI work should build gradients and accents around these values to preserve brand consistency.

## Current App Setup

- Layout metadata in `app/layout.tsx` seeds Open Graph, Twitter, and canonical tags, and renders the `logoClear` hero header.
- `next-sitemap` generates static `sitemap.xml`/`robots.txt` during `npm run build`. Set `NEXT_PUBLIC_SITE_URL` (for example `https://alias.app`) to emit correct absolute URLs.
- `scripts/trim-pngs.js` trims transparent padding from PNG assets using Sharp, helping keep logos and UI elements tight.

## Required Environment

Copy `.env` as needed and provide production credentials. The sitemap and robots routes fall back to `https://alias.app` when `NEXT_PUBLIC_SITE_URL` is absent.

## Commands

- `npm run dev` – start the Turbopack dev server on port 3000.
- `npm run build` – produce a production build (`next build --turbopack`) and regenerate sitemap outputs.
- `npm run start` – serve the production build.
- `npm run lint` – run ESLint with the Next config.
- `npm run trim:pngs` – trim all PNGs under `public` (pass a directory with `npm run trim:pngs -- path/to/dir`).

## Next Steps

- Flesh out `app/page.tsx` with the first customer-facing flows.
- Add each new route to public navigation and ensure the sitemap captures it.
- Expand component styling to incorporate the brand palette and dark/light modes.
