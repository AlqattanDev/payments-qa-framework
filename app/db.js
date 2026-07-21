'use strict';

/**
 * Ledgerline data layer.
 *
 * A small double-entry-style ledger backed by SQLite. The framework's database
 * assertions query these exact tables read-only to prove that a UI or API
 * action actually moved money — the kind of "does the system of record agree
 * with the screen?" check that matters on a payments platform.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.LEDGER_DB_PATH || path.join(DATA_DIR, 'ledger.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id            TEXT PRIMARY KEY,
      owner         TEXT NOT NULL,
      name          TEXT NOT NULL,
      currency      TEXT NOT NULL,
      balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
      FOREIGN KEY (owner) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id           TEXT PRIMARY KEY,
      from_account TEXT NOT NULL,
      to_account   TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency     TEXT NOT NULL,
      reference    TEXT NOT NULL,
      status       TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      FOREIGN KEY (from_account) REFERENCES accounts(id),
      FOREIGN KEY (to_account)   REFERENCES accounts(id)
    );
  `);
}

// Deterministic seed — every reset yields the identical starting ledger so
// tests are repeatable and independent of run order.
const SEED = {
  users: [
    { username: 'alice', password: 'Password123!', display_name: 'Alice Rahman' },
    { username: 'bob', password: 'Password123!', display_name: 'Bob Okafor' },
  ],
  accounts: [
    { id: 'ACC-1001', owner: 'alice', name: 'Alice Checking', currency: 'USD', balance_cents: 500000 },
    { id: 'ACC-1002', owner: 'alice', name: 'Alice Savings', currency: 'USD', balance_cents: 1250000 },
    { id: 'ACC-1003', owner: 'alice', name: 'Alice EUR Wallet', currency: 'EUR', balance_cents: 800000 },
    { id: 'ACC-2001', owner: 'bob', name: 'Bob Checking', currency: 'USD', balance_cents: 30000 },
  ],
};

function reset() {
  const tx = db.transaction(() => {
    db.exec('DELETE FROM payments; DELETE FROM accounts; DELETE FROM users;');
    const insUser = db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)');
    for (const u of SEED.users) insUser.run(u.username, u.password, u.display_name);
    const insAcc = db.prepare(
      'INSERT INTO accounts (id, owner, name, currency, balance_cents) VALUES (?, ?, ?, ?, ?)'
    );
    for (const a of SEED.accounts) insAcc.run(a.id, a.owner, a.name, a.currency, a.balance_cents);
  });
  tx();
}

// --- Read helpers -----------------------------------------------------------

function findUser(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function accountsForOwner(owner) {
  return db.prepare('SELECT * FROM accounts WHERE owner = ? ORDER BY id').all(owner);
}

function getAccount(id) {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function paymentsForOwner(owner) {
  return db
    .prepare(
      `SELECT p.* FROM payments p
       JOIN accounts a ON a.id = p.from_account
       WHERE a.owner = ?
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all(owner);
}

function getPayment(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

// --- Write helper -----------------------------------------------------------

/**
 * Atomically debit `from`, credit `to`, and record the payment. Balance and
 * ledger row move together or not at all — the invariant the DB-layer tests
 * assert on.
 */
function postPayment({ fromAccount, toAccount, amountCents, currency, reference }) {
  const tx = db.transaction(() => {
    const id = 'PMT-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();
    db.prepare('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?').run(
      amountCents,
      fromAccount
    );
    db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(
      amountCents,
      toAccount
    );
    db.prepare(
      `INSERT INTO payments (id, from_account, to_account, amount_cents, currency, reference, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`
    ).run(id, fromAccount, toAccount, amountCents, currency, reference, createdAt);
    return id;
  });
  const id = tx();
  return getPayment(id);
}

migrate();
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) reset();

module.exports = {
  db,
  reset,
  findUser,
  accountsForOwner,
  getAccount,
  paymentsForOwner,
  getPayment,
  postPayment,
  DB_PATH,
};
