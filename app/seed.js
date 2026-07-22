'use strict';

// Reseed the ledger to its baseline. Handy locally; CI relies on the suite's
// Before hook hitting POST /api/test/reset instead.
const store = require('./db');
store.reset();
// eslint-disable-next-line no-console
console.log('Ledger reset to baseline seed at', store.DB_PATH);
