# Third-party notices

This lists the third-party software and fonts that ship in the production build. Licences are the ones **declared in each package's `package.json`**. This file is an inventory, not a legal review.

## Runtime dependencies (in the built JavaScript)

| Package | Version | Declared licence |
|---|---|---|
| react, react-dom, scheduler | 19.3.0 / 19.3.0 / 0.28.0 | MIT |
| react-router, react-router-dom | 7.18.4 | MIT (Remix Software) |
| cookie, set-cookie-parser (via react-router) | 1.1.1 / 2.7.2 | MIT |
| zod | 4.6.5 | MIT |
| lucide-react | 1.48.0 | ISC |

## Font

- **Tajawal** (Regular, Medium, Bold). Copyright 2018 Boutros International. SIL Open Font License 1.1. The licence text is in `src/features/landing/assets/fonts/OFL.txt`.

## Build and test tools (not shipped)

Vite, Vitest, Playwright, TypeScript, Tailwind CSS, PostCSS, Autoprefixer, oxlint and type packages. All declare MIT or Apache-2.0.

## Not covered by this file

- Images in `src/features/landing/assets/` are the owner's own design material and demo captures. Their redistribution status is tracked separately by the owner.
