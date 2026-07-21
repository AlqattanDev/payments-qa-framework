'use strict';

// Minimal vanilla client for Ledgerline. No framework on purpose — the star of
// this repo is the test framework, not the app it drives.

const state = { token: null, user: null };

const $ = (sel) => document.querySelector(sel);
const byTest = (id) => document.querySelector(`[data-testid="${id}"]`);

function money(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function show(view) {
  byTest('login-view').hidden = view !== 'login';
  byTest('dashboard-view').hidden = view !== 'dashboard';
  byTest('session-bar').hidden = view !== 'dashboard';
}

function setError(el, message) {
  el.textContent = message || '';
  el.hidden = !message;
}

async function refreshDashboard() {
  const accounts = await api('/api/accounts');
  const body = byTest('accounts-body');
  const fromSelect = byTest('from-account');
  body.innerHTML = '';
  fromSelect.innerHTML = '';
  for (const a of accounts.data.accounts) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-testid', `account-row-${a.id}`);
    tr.innerHTML = `<td>${a.id}</td><td>${a.name}</td><td>${a.currency}</td>
      <td class="num" data-testid="balance-${a.id}">${money(a.balanceCents, a.currency)}</td>`;
    body.appendChild(tr);
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.id} — ${a.name} (${money(a.balanceCents, a.currency)})`;
    fromSelect.appendChild(opt);
  }

  const payments = await api('/api/payments');
  const hbody = byTest('history-body');
  hbody.innerHTML = '';
  const rows = payments.data.payments;
  byTest('history-empty').hidden = rows.length > 0;
  for (const p of rows) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-testid', `payment-row-${p.id}`);
    tr.innerHTML = `<td>${p.id}</td><td>${p.fromAccount}</td><td>${p.toAccount}</td>
      <td class="num">${money(p.amountCents, p.currency)}</td><td>${p.reference}</td>
      <td><span class="pill">${p.status}</span></td>`;
    hbody.appendChild(tr);
  }
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  setError(byTest('login-error'), '');
  const { ok, data } = await api('/api/login', {
    method: 'POST',
    body: { username: form.get('username'), password: form.get('password') },
  });
  if (!ok) return setError(byTest('login-error'), data.error || 'Sign in failed.');
  state.token = data.token;
  state.user = data.displayName;
  byTest('current-user').textContent = data.displayName;
  show('dashboard');
  await refreshDashboard();
});

$('#payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  setError(byTest('payment-error'), '');
  setError(byTest('payment-success'), '');
  const amountCents = Math.round(parseFloat(form.get('amount')) * 100);
  const { ok, data } = await api('/api/payments', {
    method: 'POST',
    body: {
      fromAccount: form.get('fromAccount'),
      toAccount: form.get('toAccount'),
      amountCents: Number.isNaN(amountCents) ? null : amountCents,
      currency: form.get('currency'),
      reference: form.get('reference'),
    },
  });
  if (!ok) return setError(byTest('payment-error'), data.error || 'Payment failed.');
  setError(byTest('payment-success'), `Payment ${data.payment.id} sent.`);
  e.target.reset();
  await refreshDashboard();
});

byTest('logout-btn').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  show('login');
});

show('login');
