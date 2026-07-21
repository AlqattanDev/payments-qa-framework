import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

/**
 * Read-only accessor over the same SQLite ledger the app writes to.
 *
 * UI and API tests prove "the screen says the payment succeeded"; these queries
 * prove "the system of record actually moved the money and balanced." On a
 * payments platform that second check is the one that matters, and it is the
 * RDBMS-level assertion the role asks for. Opened read-only so a test can never
 * mutate production-of-record data.
 */

export interface AccountRow {
  id: string;
  owner: string;
  name: string;
  currency: string;
  balance_cents: number;
}

export interface PaymentRow {
  id: string;
  from_account: string;
  to_account: string;
  amount_cents: number;
  currency: string;
  reference: string;
  status: string;
  created_at: string;
}

export class LedgerDb {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    const resolved = path.resolve(dbPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Ledger DB not found at ${resolved}. DB assertions need a local app instance.`);
    }
    this.db = new Database(resolved, { readonly: true, fileMustExist: true });
  }

  account(id: string): AccountRow | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined;
  }

  balanceCents(id: string): number {
    const row = this.account(id);
    if (!row) throw new Error(`Account ${id} not found in ledger`);
    return row.balance_cents;
  }

  payment(id: string): PaymentRow | undefined {
    return this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as PaymentRow | undefined;
  }

  paymentCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM payments').get() as { n: number }).n;
  }

  /**
   * The ledger's global invariant: total money held across all accounts never
   * changes on a transfer. Every DB-layer scenario can lean on this.
   */
  totalBalanceCents(): number {
    return (this.db.prepare('SELECT COALESCE(SUM(balance_cents), 0) AS t FROM accounts').get() as { t: number }).t;
  }

  close(): void {
    this.db.close();
  }
}
