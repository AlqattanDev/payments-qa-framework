'use strict';

/**
 * Boot the Ledgerline app, wait until it is healthy, run the command passed as
 * arguments, then shut the app down, propagating the command's exit code.
 *
 * The Cucumber suite boots the app itself from a hook; the Cypress and Selenium
 * runners do not, so they go through this wrapper.
 *
 *   node scripts/with-app.js npx cypress run
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || '3300';
const BASE = `http://127.0.0.1:${PORT}`;
const command = process.argv.slice(2);

if (command.length === 0) {
  console.error('usage: node scripts/with-app.js <command...>');
  process.exit(2);
}

const app = spawn('node', ['app/server.js'], {
  env: { ...process.env, PORT },
  stdio: 'inherit',
});

function ping() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/api/health`, (res) => {
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

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await ping()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`App never became healthy at ${BASE}`);
}

function shutdown(code) {
  app.kill('SIGTERM');
  process.exit(code);
}

(async () => {
  try {
    await waitForHealth();
  } catch (err) {
    console.error(err.message);
    return shutdown(1);
  }

  const child = spawn(command[0], command.slice(1), {
    env: { ...process.env, BASE_URL: BASE, PORT },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => shutdown(code ?? 1));
  child.on('error', (err) => {
    console.error(err.message);
    shutdown(1);
  });
})();
