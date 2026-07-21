/**
 * Environment configuration.
 *
 * One framework, many targets. `TEST_ENV` selects a profile so the same suite
 * runs against a locally-booted app in CI or a deployed instance in a shared
 * environment — the multi-env shape a real SDLC (dev → sit → uat) needs.
 */

export type EnvName = 'local' | 'ci' | 'uat';

export interface EnvConfig {
  name: EnvName;
  baseURL: string;
  /** Path to the ledger SQLite file for direct DB assertions (local/CI only). */
  dbPath: string | null;
  headless: boolean;
}

const PORT = process.env.PORT || '3000';

const PROFILES: Record<EnvName, EnvConfig> = {
  local: {
    name: 'local',
    baseURL: `http://127.0.0.1:${PORT}`,
    dbPath: process.env.LEDGER_DB_PATH || 'app/data/ledger.db',
    headless: false,
  },
  ci: {
    name: 'ci',
    baseURL: `http://127.0.0.1:${PORT}`,
    dbPath: process.env.LEDGER_DB_PATH || 'app/data/ledger.db',
    headless: true,
  },
  uat: {
    name: 'uat',
    // A deployed target has no local DB file, so DB-layer steps are skipped.
    baseURL: process.env.BASE_URL || 'https://ledgerline.uat.example.com',
    dbPath: null,
    headless: true,
  },
};

export function loadEnv(): EnvConfig {
  const name = (process.env.TEST_ENV as EnvName) || 'local';
  const profile = PROFILES[name];
  if (!profile) throw new Error(`Unknown TEST_ENV="${name}". Use one of: ${Object.keys(PROFILES).join(', ')}`);
  return profile;
}

export const CREDENTIALS = {
  alice: { username: 'alice', password: 'Password123!', displayName: 'Alice Rahman' },
  bob: { username: 'bob', password: 'Password123!', displayName: 'Bob Okafor' },
};
