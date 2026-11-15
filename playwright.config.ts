import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.KAWADERNA_BROWSER ?? (existsSync(chrome) ? chrome : undefined);
const testPort = Number(process.env.KAWADERNA_TEST_PORT ?? 5173);
if (!Number.isInteger(testPort) || testPort < 1 || testPort > 65535) throw new Error('KAWADERNA_TEST_PORT must be a valid TCP port');

export default defineConfig({
  testDir: './tests/e2e',
  // The shared Windows workspace cannot reliably sustain four browser workers.
  // Override explicitly when measuring concurrency on a dedicated runner.
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${testPort}`, trace: 'retain-on-failure', ...devices['Desktop Chrome'], launchOptions: { executablePath } },
  globalSetup: './tests/e2e/demo-server.ts',
  reporter: 'list',
  preserveOutput: 'always',
  // Concurrent agent runs must never clean one another's traces or screenshots.
  outputDir: join(tmpdir(), `kawaderna-playwright-${randomUUID()}`),
});
