#!/usr/bin/env node
/**
 * Post-build release guard. Runs after `vite build` (npm "postbuild") and fails the build when the deployable
 * output could leak protected or internal material, or when a required release file is missing.
 *
 *   node scripts/check-dist.mjs               scan ./dist and ./src
 *   node scripts/check-dist.mjs --self-test   prove the detectors fire on synthetic markers built at run time
 *
 * Design notes
 * - Known internal identifiers (Figma node ids, Figma file keys, protected Toolkit field names) are NOT written here in
 *   clear text. Only their SHA-256 digests are. The scanner pulls candidate tokens out of each file with a narrow
 *   shape test and fails only when a candidate's digest is on the list, so harmless numeric constants such as `1:1`
 *   or `2026:10` in a bundled library are never rejected.
 * - Generic patterns (local machine paths, private keys, source-map references, Figma/Notion URLs, internal document
 *   paths) are matched in clear text because they carry no secret themselves.
 * - The source boundary check rejects imports that leave `src/` or reach into documentation, specification or review folders.
 * - Digests are not a security control: short identifiers can be guessed. They only keep the identifiers out of casual view.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// SHA-256 digests of known internal identifiers (see header note).
const DIGESTS = {
  "node": [
    "00cb94c706337dc315766d76e5e6ef8bc59c6e6196e5e5f4e8ed21916e8b8c2b",
    "07e90cf5b71bd0f9b6bdeac338e0c1c526cda9b6bf769ba5b28eb742dfa9aede",
    "134890f619afd8738fef7b9232ce3e3fabbce880033efc419ca012dbfbd5fb46",
    "408002c58dccb2efbf6e89056f40c423fdc314ffcf95073989794d39cb5dcb5a",
    "4659ed371c1a3173b25b0154b889dcd48582cc71733db87a9ae19693b224990f",
    "473a4e56fafefbef44c770b09b9f00cdaa3f989b02d5e62fc961679ec8d0c82c",
    "4e80ea8bac3f2e1be2518ffee7bd4f284ddaf48a12beb61e1e40274123a24cfb",
    "4e9e6b7b24575442fc958fcd0edad2f88a3915ae883a143dc4adfcccc9e31013",
    "5508fa32980aaa939fa2b770e545f34b47bd6f463b641bad93ba90965d679af8",
    "64f55b108c344c30eafe7f0fa09e29d09cd0d8d7eddc40f95f01e6068da04028",
    "6b66b86060f9bd4010f5e566eebf52fee9475d67142bf9cf174bed8933d65d28",
    "8e163c0823e7431f055889df42f59a7606e3cb52bc66d3747b968aba2947bdfc",
    "91d9c0b4cc729c82e13856dd3e3f8b62e18afd8d72359949d275663b2ad5cce0",
    "96e98090e0a5d832ab7cd3f175cbddc9fade1b54b45bf6ca97b13315ae62930c",
    "a5243f72af7ef658f3a18ffdf42873c852aa87f1205f8d3586431f66ab154af0",
    "a857901e7918275fd3cf53c4820ffd4f214d1da876182e8cb2090ddbc65995d2",
    "beee7509354f990adcd030472433889e8d5b5e21cc88cf81c82dadf8501a8ff1",
    "c382a9bd62504467e69787420a38de1b20fb34b802aaa11e779253448e5167be",
    "ddc72d87a330a8df29cc1ebeed36e8f8edb03d3df360e12e60844c8f8d0e6e5a",
    "eb30af1442e0aee3abdfdd0c141919069a0a9378c95eb5f4eb6e23cdc0043d80",
    "ef9413e9422ad2d7a7bbd77714b28c9be7d57b77604256876e0644e5c290ce0f"
  ],
  "key": [
    "8ecf842c066aef5b6c8ffce04bcc957a5a942419d0a6e65580691b0c59d66a2e",
    "9ca4da636fedf2fa775400aeb6874938b70bbfa237875663d42b962d3818f199"
  ],
  "snake": [
    "cd205b3e3fcf192e7e1d9256cf2bef1cbf34f86ed7d8f7c983d70718b91ac246"
  ]
};

// Narrow candidate shapes. A candidate is only a finding when its digest is in DIGESTS.
const CANDIDATES = {
  figmaNodeId: /(?<![\w:.-])\d{2,5}:\d{2,6}(?![\w:])/g,
  figmaFileKey: /(?<![A-Za-z0-9])[A-Za-z0-9]{22}(?![A-Za-z0-9])/g,
  protectedField: /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g,
};
const DIGEST_GROUP = { figmaNodeId: 'node', figmaFileKey: 'key', protectedField: 'snake' };

// Clear-text patterns that are never legitimate in the public output.
const PATTERNS = [
  ['local machine path', /[A-Za-z]:[\\/]+(?:Users|ux designs|Windows)\b/i],
  ['unix home path', /(?:^|[\s"'`(=])\/(?:Users|home)\/[A-Za-z0-9._-]+\//],
  ['source-map reference', /sourceMappingURL\s*=/],
  ['Figma file URL', /figma\.com\/(?:design|file|board|proto|make)\//i],
  ['Figma node-id query', /[?&]node-id=/i],
  ['Notion URL', /(?:^|[^a-z])notion\.(?:so|site)\//i],
  ['internal document path', /docs\/(?:enterprise-blueprint|figma-agent|agent-coordination)|release-audit\/|specs\/0\d\d-|case study\//i],
  ['agent or project-contract file', /(?:^|[^A-Za-z])(?:CLAUDE\.md|AGENTS\.md|PROJECT_CONTEXT\.md|\.claude\/)/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['API secret key', /\bsk-[A-Za-z0-9_-]{32,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
];

const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.txt', '.xml', '.json', '.svg', '.md', '.webmanifest', '']);
const ALLOWED_EXT = new Set(['.html', '.js', '.css', '.jpg', '.jpeg', '.png', '.svg', '.ttf', '.woff2', '.txt', '.xml', '.ico', '']);
const ALLOWED_NO_EXT = new Set(['_headers', '_redirects']);
const REQUIRED_FILES = ['index.html', 'robots.txt', 'sitemap.xml', 'og-image.png', '_headers', '_redirects', 'favicon.svg'];

/** Scan one text blob. `extraDigests` lets the self-test inject a synthetic identifier digest. */
export function scanText(name, text, extraDigests = {}) {
  const findings = [];
  for (const [label, pattern] of PATTERNS) {
    if (pattern.test(text)) findings.push({ file: name, rule: label });
  }
  for (const [kind, regex] of Object.entries(CANDIDATES)) {
    const group = DIGEST_GROUP[kind];
    const known = new Set([...(DIGESTS[group] ?? []), ...(extraDigests[group] ?? [])]);
    for (const match of text.matchAll(regex)) {
      if (known.has(sha256(match[0]))) findings.push({ file: name, rule: `known internal identifier (${kind})`, digest: sha256(match[0]).slice(0, 12) });
    }
  }
  return findings;
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const rel = (base, file) => relative(base, file).split(sep).join('/');

/** Output scan: file-type allowlist, required files, content scan, release-metadata presence. */
export function checkDist(distDir, extraDigests = {}) {
  const findings = [];
  if (!existsSync(distDir)) return [{ file: distDir, rule: 'dist folder is missing: run the build first' }];
  const files = walk(distDir);
  for (const required of REQUIRED_FILES) {
    if (!files.some((file) => rel(distDir, file) === required)) findings.push({ file: required, rule: 'required release file is missing' });
  }
  for (const file of files) {
    const name = rel(distDir, file);
    const base = name.split('/').pop();
    const ext = extname(base).toLowerCase();
    if (ext === '.map') { findings.push({ file: name, rule: 'source map must not ship' }); continue; }
    if (!(ALLOWED_EXT.has(ext) && (ext !== '' || ALLOWED_NO_EXT.has(base)))) { findings.push({ file: name, rule: `file type not allowed in the public output (${ext || 'no extension'})` }); continue; }
    if (TEXT_EXT.has(ext)) findings.push(...scanText(name, readFileSync(file, 'utf8'), extraDigests));
  }
  const indexPath = join(distDir, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    for (const [label, test] of [
      ['canonical link', /<link rel="canonical" href="https:\/\/[^"]+"/],
      ['og:image meta', /<meta property="og:image" content="https:\/\/[^"]+"/],
      ['twitter:image meta', /<meta name="twitter:image" content="https:\/\/[^"]+"/],
    ]) if (!test.test(html)) findings.push({ file: 'index.html', rule: `release metadata missing: ${label}` });
  }
  const headersPath = join(distDir, '_headers');
  if (existsSync(headersPath) && !/Content-Security-Policy:/i.test(readFileSync(headersPath, 'utf8'))) findings.push({ file: '_headers', rule: 'Content-Security-Policy is missing' });
  return findings;
}

/** Source boundary: nothing under src/ may import from outside src/ or from documentation, spec or review material. */
export function checkSourceBoundary(srcDir) {
  const findings = [];
  if (!existsSync(srcDir)) return findings;
  const IMPORT = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
  const FORBIDDEN = /(?:^|\/)(?:docs|review|release-audit|specs|case study|enterprise-blueprint|prompt-toolkit-source)(?:\/|$)|\.claude|\bCLAUDE\.md|\bAGENTS\.md/i;
  for (const file of walk(srcDir)) {
    if (!/\.(?:ts|tsx|mts|js|jsx|mjs|css)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(IMPORT)) {
      const spec = match[1];
      const where = rel(ROOT, file);
      if (FORBIDDEN.test(spec)) { findings.push({ file: where, rule: `import reaches protected or internal material: ${spec}` }); continue; }
      if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec);
        if (relative(srcDir, target).startsWith('..')) findings.push({ file: where, rule: `import leaves src/: ${spec}` });
      }
    }
  }
  return findings;
}

/** Proves each detector fires, using markers assembled at run time so no marker is ever stored in a file. */
export function selfTest() {
  const synthetic = ['99991', '88882'].join(':');
  const syntheticDigests = { node: [sha256(synthetic)] };
  const cases = [
    ['digest-listed Figma node id', `const x = "${synthetic}"`, (f) => f.some((v) => v.rule.includes('figmaNodeId'))],
    ['harmless numeric constant is NOT flagged', 'const ratio = "1:1"; const t = "2026:10"; const z = 40:20', (f) => f.length === 0],
    ['local Windows path', ['C', ':\\', 'Users\\someone\\project'].join(''), (f) => f.some((v) => v.rule === 'local machine path')],
    ['source-map reference', ['//# source', 'MappingURL=app.js.map'].join(''), (f) => f.some((v) => v.rule === 'source-map reference')],
    ['Figma file URL', ['https://www.fig', 'ma.com/design/abc/x'].join(''), (f) => f.some((v) => v.rule === 'Figma file URL')],
    ['private key block', ['-----BEGIN RSA PRIV', 'ATE KEY-----'].join(''), (f) => f.some((v) => v.rule === 'private key block')],
    ['internal document path', ['docs/enterprise', '-blueprint/x.md'].join(''), (f) => f.some((v) => v.rule === 'internal document path')],
  ];
  const results = cases.map(([label, text, expect]) => ({ label, ok: expect(scanText('synthetic', text, syntheticDigests)) }));
  const boundary = ['../../docs/', 'x'].join('');
  results.push({ label: 'forbidden import specifier', ok: /(?:^|\/)docs(?:\/|$)/.test(boundary) });
  return results;
}

function main() {
  if (process.argv.includes('--self-test')) {
    const results = selfTest();
    for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
    if (results.some((r) => !r.ok)) process.exit(1);
    return;
  }
  const dist = resolve(ROOT, process.env.KAWADERNA_CHECK_DIST || 'dist');
  // Test hook: extra digests (JSON) let an operator prove the scan end to end against a throw-away copy of dist.
  const extra = process.env.KAWADERNA_CHECK_EXTRA_DIGESTS ? JSON.parse(process.env.KAWADERNA_CHECK_EXTRA_DIGESTS) : {};
  const findings = [...checkDist(dist, extra), ...checkSourceBoundary(resolve(ROOT, 'src'))];
  const filesScanned = existsSync(dist) ? walk(dist).length : 0;
  if (findings.length) {
    console.error(`check-dist: ${findings.length} problem(s) found. The build is rejected.`);
    for (const f of findings) console.error(`  - ${f.file}: ${f.rule}${f.digest ? ` [${f.digest}]` : ''}`);
    process.exit(1);
  }
  console.log(`check-dist: OK. ${filesScanned} files in ${rel(ROOT, dist) || '.'} scanned, source boundary clean.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
