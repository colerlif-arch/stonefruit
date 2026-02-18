const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      item_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      institution_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      account_id TEXT,
      item_id TEXT,
      pending INTEGER,
      pending_transaction_id TEXT,
      authorized_date TEXT,
      date TEXT,
      amount REAL,
      iso_currency_code TEXT,
      name TEXT,
      personal_finance_category_json TEXT,
      location_json TEXT,
      payment_meta_json TEXT,
      raw_json TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transaction_sync_state (
      item_id TEXT PRIMARY KEY,
      cursor TEXT,
      has_more INTEGER DEFAULT 0,
      last_sync_ts TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
  `);
    // Ensure dedupe fingerprint column and unique index exist.
    const cols = db.prepare("PRAGMA table_info(transactions)").all();
    if (!cols.find((c) => c.name === "fingerprint")) {
      db.exec("ALTER TABLE transactions ADD COLUMN fingerprint TEXT");
    }
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_fingerprint ON transactions(fingerprint)");
    // Ensure content_hash column for content-based dedupe and an index for lookups.
    if (!cols.find((c) => c.name === "content_hash")) {
      db.exec("ALTER TABLE transactions ADD COLUMN content_hash TEXT");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_content_hash ON transactions(content_hash)");
}

function resolveDbPath() {
  // Docker sets SQLITE_DB_PATH=/data/plaid.db.
  // For local runs, default to repo data-layer/raw/plaid.db.
  return process.env.SQLITE_DB_PATH || path.resolve(__dirname, "..", "..", "raw", "plaid.db");
}

function openDb() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("foreign_keys = OFF");
  db.pragma("journal_mode = WAL");
  ensureSchema(db);
  db._resolvedPath = dbPath;
  return db;
}

function upsertTransactions({ itemId, added = [], modified = [], removed = [], nextCursor = "" }) {
  const db = openDb();
  let insertedOrUpdated = 0;
  let deleted = 0;

  const upsertTx = db.prepare(`
    INSERT INTO transactions (
      transaction_id, account_id, item_id, pending, pending_transaction_id,
      authorized_date, date, amount, iso_currency_code,
      name,
      personal_finance_category_json, location_json, payment_meta_json, raw_json, fingerprint, content_hash,
      updated_at
    ) VALUES (
      @transaction_id, @account_id, @item_id, @pending, @pending_transaction_id,
      @authorized_date, @date, @amount, @iso_currency_code,
      @name,
      @personal_finance_category_json, @location_json, @payment_meta_json, @raw_json, @fingerprint, @content_hash,
      datetime('now')
    )
    ON CONFLICT(transaction_id) DO UPDATE SET
      account_id=excluded.account_id,
      -- preserve original item_id on conflict to avoid reassigning transactions when items are relinked
      item_id=item_id,
      pending=excluded.pending,
      pending_transaction_id=excluded.pending_transaction_id,
      authorized_date=excluded.authorized_date,
      date=excluded.date,
      amount=excluded.amount,
      iso_currency_code=excluded.iso_currency_code,
      name=excluded.name,
      personal_finance_category_json=excluded.personal_finance_category_json,
      location_json=excluded.location_json,
      payment_meta_json=excluded.payment_meta_json,
      raw_json=excluded.raw_json,
      fingerprint=excluded.fingerprint,
      content_hash=excluded.content_hash,
      updated_at=datetime('now');
  `);

  const delTx = db.prepare(`DELETE FROM transactions WHERE transaction_id = ?`);

  const upsertCursor = db.prepare(`
    INSERT INTO transaction_sync_state (item_id, cursor, has_more, last_sync_ts)
    VALUES (?, ?, 0, datetime('now'))
    ON CONFLICT(item_id) DO UPDATE SET
      cursor=excluded.cursor,
      has_more=0,
      last_sync_ts=datetime('now');
  `);

  const normalize = (tx) => ({
    transaction_id: tx.transaction_id,
    account_id: tx.account_id,
    item_id: itemId,
    pending: tx.pending ? 1 : 0,
    pending_transaction_id: tx.pending_transaction_id || null,
    authorized_date: tx.authorized_date || null,
    date: tx.date,
    amount: Number(tx.amount),
    iso_currency_code: tx.iso_currency_code || null,
    name: tx.name || null,
    personal_finance_category_json: tx.personal_finance_category ? JSON.stringify(tx.personal_finance_category) : null,
    location_json: tx.location ? JSON.stringify(tx.location) : null,
    payment_meta_json: tx.payment_meta ? JSON.stringify(tx.payment_meta) : null,
    raw_json: JSON.stringify(tx),
    fingerprint: tx.transaction_id,
    // content_hash intentionally excludes `account_id` so that the same logical
    // transaction from a relinked item (which may change account/item ids) still
    // deduplicates on ingest. It uses date, amount, currency, normalized name,
    // and payment_meta when available.
    content_hash: crypto.createHash('sha256')
      .update([
        tx.date || '',
        String(tx.amount || ''),
        tx.iso_currency_code || '',
        (tx.name || '').trim().toLowerCase(),
        tx.payment_meta ? JSON.stringify(tx.payment_meta) : '',
      ].join('|'))
      .digest('hex'),
  });

  const findByFingerprint = db.prepare(`SELECT transaction_id FROM transactions WHERE fingerprint = ? LIMIT 1`);
  const findByContentHash = db.prepare(`SELECT transaction_id FROM transactions WHERE content_hash = ? LIMIT 1`);

  const txn = db.transaction(() => {
    for (const t of added) {
      const norm = normalize(t);
      // If transaction_id exists and matches an existing row, upsert will update.
      // If transaction_id differs but content_hash matches an existing row, treat as duplicate and skip.
      const existingByFingerprint = norm.fingerprint ? findByFingerprint.get(norm.fingerprint) : null;
      if (existingByFingerprint && existingByFingerprint.transaction_id !== norm.transaction_id) {
        continue;
      }
      const existingByContent = findByContentHash.get(norm.content_hash);
      if (existingByContent && existingByContent.transaction_id !== norm.transaction_id) {
        // Same content seen before under a different transaction_id — skip to avoid duplicates from relinks.
        continue;
      }
      insertedOrUpdated += upsertTx.run(norm).changes;
    }
    for (const t of modified) {
      const norm = normalize(t);
      insertedOrUpdated += upsertTx.run(norm).changes;
    }
    for (const r of removed) deleted += delTx.run(r.transaction_id).changes;
    upsertCursor.run(itemId, nextCursor || "");
  });

  txn();
  const totalRows = db.prepare(`SELECT COUNT(*) AS count FROM transactions`).get().count;
  console.log("[sqlite_persist] upsertTransactions committed", {
    dbPath: db._resolvedPath,
    itemId,
    addedCount: added.length,
    modifiedCount: modified.length,
    removedCount: removed.length,
    insertedOrUpdated,
    deleted,
    totalRows,
    nextCursor: nextCursor || null,
  });
  db.close();
}

function upsertItem({ itemId, accessToken, institutionId = null }) {
  if (!itemId || !accessToken) {
    throw new Error("upsertItem requires itemId and accessToken");
  }
  const db = openDb();
  try {
    db.prepare(`
      INSERT INTO items (item_id, access_token, institution_id, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(item_id) DO UPDATE SET
        access_token=excluded.access_token,
        institution_id=excluded.institution_id,
        updated_at=datetime('now')
    `).run(itemId, accessToken, institutionId);
  } finally {
    db.close();
  }
}

function getItemIdByAccessToken(accessToken) {
  if (!accessToken) return null;
  const db = openDb();
  try {
    const row = db.prepare(`
      SELECT item_id
      FROM items
      WHERE access_token = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(accessToken);
    return row?.item_id || null;
  } finally {
    db.close();
  }
}

function getLatestItem() {
  const db = openDb();
  try {
    const row = db.prepare(`
      SELECT item_id, access_token
      FROM items
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    return row || null;
  } finally {
    db.close();
  }
}

function getLatestValidItem() {
  const db = openDb();
  try {
    const row = db.prepare(`
      SELECT item_id, access_token
      FROM items
      WHERE access_token LIKE 'access-%-%'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get();
    return row || null;
  } finally {
    db.close();
  }
}

function getTransactionSyncCursor(itemId) {
  if (!itemId) return null;
  const db = openDb();
  try {
    const row = db.prepare(`
      SELECT cursor
      FROM transaction_sync_state
      WHERE item_id = ?
      LIMIT 1
    `).get(itemId);
    return row?.cursor || null;
  } finally {
    db.close();
  }
}

function getTransactionsPersistenceDebug(sampleSize = 5) {
  const db = openDb();
  const safeSampleSize = Number.isInteger(sampleSize) && sampleSize > 0 ? sampleSize : 5;
  const totalRows = db.prepare(`SELECT COUNT(*) AS count FROM transactions`).get().count;
  const totalSyncStateRows = db.prepare(`SELECT COUNT(*) AS count FROM transaction_sync_state`).get().count;
  const sampleTransactions = db.prepare(`
    SELECT transaction_id, account_id, item_id, date, amount, name, updated_at
    FROM transactions
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(safeSampleSize);
  const syncStates = db.prepare(`
    SELECT item_id, cursor, has_more, last_sync_ts
    FROM transaction_sync_state
    ORDER BY last_sync_ts DESC
    LIMIT ?
  `).all(safeSampleSize);
  const payload = {
    dbPath: db._resolvedPath,
    totalRows,
    totalSyncStateRows,
    sampleTransactions,
    syncStates,
  };
  db.close();
  return payload;
}

module.exports = { upsertTransactions, upsertItem, getItemIdByAccessToken, getLatestItem, getLatestValidItem, getTransactionSyncCursor, getTransactionsPersistenceDebug };
