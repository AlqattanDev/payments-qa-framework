import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';

/**
 * Boots the Ledgerline app as a child process for the duration of a test run
 * and tears it down after. Making the suite own its System Under Test is what
 * lets `npm test` be a single self-contained command locally and in CI — no
 * "remember to start the server first" footgun.
 *
 * Skipped automatically when TEST_ENV targets a deployed instance (uat).
 */

let proc: ChildProcess | null = null;

function ping(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(baseURL: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await ping(`${baseURL}/api/health`)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`App did not become healthy at ${baseURL} within ${timeoutMs}ms`);
}

export async function startApp(baseURL: string, envName: string): Promise<void> {
  if (envName === 'uat') return; // remote target, nothing to boot
  if (await ping(`${baseURL}/api/health`)) return; // already running (e.g. dev loop)

  const port = new URL(baseURL).port || '3000';
  proc = spawn('node', [path.resolve('app/server.js')], {
    env: { ...process.env, PORT: port },
    stdio: 'ignore',
  });
  await waitForHealth(baseURL);
}

export async function stopApp(): Promise<void> {
  if (proc) {
    proc.kill('SIGTERM');
    proc = null;
  }
}
