import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Keep Vite in the runner process: Windows subprocess-tree shutdown can hang after
// every test has finished. Strict port + explicit root also forbid a foreign server.
export default async function startDemoServer(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const target = new URL(baseURL);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const server = await createServer({
    root,
    cacheDir: fileURLToPath(new URL('../../node_modules/.vite-e2e-tests', import.meta.url)),
    server: { host: target.hostname, port: Number(target.port), strictPort: true },
  });
  try {
    await server.listen();
    // Compile the actual entry once before parallel workers compete for cold transforms.
    const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const browser = await chromium.launch({ executablePath: process.env.KAWADERNA_BROWSER ?? (existsSync(chrome) ? chrome : undefined) });
    try {
      const page = await browser.newPage();
      await page.goto(new URL('/demo', baseURL).href);
      await page.locator('[data-demo-login]').waitFor();
      await page.evaluate(() => document.fonts.ready);
    } finally { await browser.close(); }
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => { await server.close(); };
}
