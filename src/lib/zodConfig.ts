import { z } from 'zod'

// The site's Content-Security-Policy (public/_headers) forbids eval. Zod's optional JIT would probe it when a schema is built,
// and the blocked probe is reported as a CSP violation. Parsing behaviour is the same without it; only the speed-up is off.
// This module must be the first import of main.tsx: schemas are created while the other imports evaluate.
z.config({ jitless: true })
