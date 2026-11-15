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
| any other path | Redirects to `/` |

`public/_redirects` (`/*  /index.html  200`) makes deep links and refresh work. `public/_headers` sets basic security headers and long-term caching for hashed assets.

## Local checks

```bash
npm ci
npx tsc -b
npx oxlint
npx vitest run --maxWorkers=1
npm run build
```

Browser tests (`npx playwright test`) use the Chrome installed on the machine and take about ten minutes.

## Notes

- The demo is a sales demonstration. Accounts and data are fictional and state lives in the browser tab only.
- The build emits no source maps.
