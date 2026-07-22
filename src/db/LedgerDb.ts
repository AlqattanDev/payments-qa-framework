import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// Read-only accessor over the same SQLite ledger the app writes to. UI and API
// checks prove the screen said the payment succeeded; these prove the money
// actually moved. Read-only so a test can never mutate the system of record.

export interface AccountRow {
  id: string;
  owner: string;
  name: string;
  currency: string;
  balance_cents: number;
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

  /**
   * The ledger's global invariant: total money held across all accounts never
   * changes on a transfer.
   */
  totalBalanceCents(): number {
    return (this.db.prepare('SELECT COALESCE(SUM(balance_cents), 0) AS t FROM accounts').get() as { t: number }).t;
  }

  close(): void {
    this.db.close();
  }
}
