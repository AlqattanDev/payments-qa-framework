'use strict';

/**
 * Ledgerline: a small payments API and web UI that exists to be the system
 * under test for the automation framework in this repo. Realistic where it
 * counts (token auth, ownership checks, payment validation, a SQLite ledger
 * that has to stay consistent) and trivial everywhere else.
 */

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const store = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory token -> username. Fine for a demo SUT; never how you'd ship auth.
const sessions = new Map();

const CURRENCIES = new Set(['USD', 'EUR', 'GBP']);

function fail(res, httpStatus, code, message) {
  return res.status(httpStatus).json({ error: message, code });
}

function authed(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const username = token && sessions.get(token);
  if (!username) return fail(res, 401, 'UNAUTHORIZED', 'Authentication required.');
  req.username = username;
  next();
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, 400, 'MISSING_FIELD', 'Username and password are required.');
  const user = store.findUser(username);
  if (!user || user.password !== password) {
    return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
  res.json({ token, displayName: user.display_name, username });
});

app.get('/api/accounts', authed, (req, res) => {
  const accounts = store.accountsForOwner(req.username).map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    balanceCents: a.balance_cents,
  }));
  res.json({ accounts });
});

app.get('/api/payments', authed, (req, res) => {
  const payments = store.paymentsForOwner(req.username).map(serializePayment);
  res.json({ payments });
});

app.get('/api/payments/:id', authed, (req, res) => {
  const payment = store.getPayment(req.params.id);
  if (!payment) return fail(res, 404, 'NOT_FOUND', 'Payment not found.');
  const from = store.getAccount(payment.from_account);
  if (!from || from.owner !== req.username) return fail(res, 403, 'FORBIDDEN', 'Not your payment.');
  res.json({ payment: serializePayment(payment) });
});

app.post('/api/payments', authed, (req, res) => {
  const { fromAccount, toAccount, amountCents, currency, reference } = req.body || {};

  // Each branch below maps to a scenario in the suite.
  if (!fromAccount || !toAccount || amountCents === undefined || amountCents === null || !currency) {
    return fail(res, 400, 'MISSING_FIELD', 'fromAccount, toAccount, amountCents and currency are required.');
  }
  if (!CURRENCIES.has(currency)) {
    return fail(res, 400, 'UNSUPPORTED_CURRENCY', `Currency ${currency} is not supported.`);
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return fail(res, 400, 'INVALID_AMOUNT', 'amountCents must be a positive integer number of cents.');
  }
  if (typeof reference !== 'string' || reference.trim().length < 3 || reference.length > 140) {
    return fail(res, 400, 'INVALID_REFERENCE', 'reference must be between 3 and 140 characters.');
  }
  if (fromAccount === toAccount) {
    return fail(res, 400, 'SAME_ACCOUNT', 'Source and destination accounts must differ.');
  }

  const from = store.getAccount(fromAccount);
  const to = store.getAccount(toAccount);
  if (!from || !to) return fail(res, 404, 'ACCOUNT_NOT_FOUND', 'Source or destination account does not exist.');
  if (from.owner !== req.username) return fail(res, 403, 'FORBIDDEN', 'You do not own the source account.');
  if (from.currency !== currency || to.currency !== currency) {
    return fail(res, 422, 'CURRENCY_MISMATCH', 'Both accounts must match the payment currency.');
  }
  if (from.balance_cents < amountCents) {
    return fail(res, 422, 'INSUFFICIENT_FUNDS', 'Source account has insufficient funds.');
  }

  const payment = store.postPayment({ fromAccount, toAccount, amountCents, currency, reference: reference.trim() });
  res.status(201).json({ payment: serializePayment(payment) });
});

// Reseed the ledger to a known baseline. In a real system this would sit behind
// an env flag; here the whole app is a fixture, so it is always available and
// the suite calls it in a Before hook.
app.post('/api/test/reset', (req, res) => {
  store.reset();
  sessions.clear();
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

function serializePayment(p) {
  return {
    id: p.id,
    fromAccount: p.from_account,
    toAccount: p.to_account,
    amountCents: p.amount_cents,
    currency: p.currency,
    reference: p.reference,
    status: p.status,
    createdAt: p.created_at,
  };
}

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Ledgerline running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
