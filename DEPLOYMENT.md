# Deployment (Cloudflare Pages)

Static single-page app (Vite + React). No server, no database, no API.

## Build settings

| Setting | Value |
|---|---|
| Framework preset | Vite (or None) |
| Root directory | `/` (repository root) |
| Install command | `npm ci` |
| Build command | `npm run build` (runs `tsc -b && vite build`) |
| Build output directory | `dist` |
| Environment variable `NODE_VERSION` | `22` (Vite 8 needs Node `^20.19.0 \|\| >=22.12.0`) |
| Environment variable `VITE_BUYER_CONTACT_HREF` | Optional. Overrides the Landing's contact link at build time |

## Routes

| Path | Content |
|---|---|
| `/` | Landing page |
| `/demo` | Interactive leave demo |
| any other path | A minimal "page not found" screen with links back to `/` and `/demo` (`noindex`, no canonical) |

`public/_redirects` (`/*  /index.html  200`) makes deep links and refresh work. Files that exist in `dist` (`robots.txt`, `sitemap.xml`, `og-image.png`, `favicon.svg`, assets) are served as themselves; the rule only applies to paths with no file. This was observed on the live site: `/favicon.svg` returned the SVG, an unknown path returned the app shell.

**Known limitation: unknown paths return HTTP 200, not 404.** Per Cloudflare's Pages documentation (recalled, not re-checked in this pass), the single-page fallback is off as soon as a top-level `404.html` exists, which would break direct loads and refresh of `/demo`. The not-found screen therefore carries `<meta name="robots" content="noindex">` and no canonical link. Giving unknown paths a real 404 needs a `404.html` plus an explicit `/demo` rewrite and has to be tested on Cloudflare itself. It is not done.

## Public metadata

- Canonical host: `https://kawaderna-web.pages.dev/` (in `index.html`: canonical, `og:url`, `og:image`, `twitter:image`). If a custom domain replaces it, change those four values, `public/robots.txt` and `public/sitemap.xml` together.
- `public/og-image.png` is 1200x630 and is built from the already published dashboard crop. It does not show a live product.
- `/demo` sets its own title, description and canonical while mounted and restores the Landing values on leaving.

## Headers (`public/_headers`)

`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Strict-Transport-Security: max-age=15552000` (no `includeSubDomains`, no `preload`), and a Content-Security-Policy that allows only same-origin scripts, fonts, images and connections plus inline styles (React style attributes need them). The CSP was exercised against the built output served with these exact headers: Landing, both themes, demo sign-in, approve, reload, Back/Forward, at desktop and phone width, with zero violations. `src/lib/zodConfig.ts` turns off Zod's optional JIT because the policy forbids `eval`. A header scan is not a penetration test.

## Release guard

`npm run build` runs `scripts/check-dist.mjs` afterwards and fails the build when `dist` or `src` break the release rules: source maps, unexpected file types, local paths, private keys, Figma/Notion URLs, internal document paths, known internal Figma identifiers (stored only as SHA-256 digests), missing `robots.txt`, `sitemap.xml`, `og-image.png`, canonical/OG metadata or CSP, and `src` imports that leave `src/` or reach docs, specs or review folders. `npm run check:dist:selftest` proves each detector fires on markers built at run time.

## Local checks

```bash
npm ci
npx tsc -b
npx oxlint
npx vitest run --maxWorkers=1
npm run build          # also runs the release guard
npm run check:dist:selftest
```

Browser tests (`npx playwright test`) use the Chrome installed on the machine and take about ten minutes.

## Notes

- The demo is a sales demonstration. Accounts and data are fictional and state lives in the browser tab only.
- The build emits no source maps.
- The JavaScript is one bundle (about 155 KB gzip). Lazy-loading the demo was measured and not adopted: it saved about 19 KB on the Landing and made `/demo` slower on a throttled phone profile.
