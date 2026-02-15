const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

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
      personal_finance_category_json, location_json, payment_meta_json, raw_json,
      updated_at
    ) VALUES (
      @transaction_id, @account_id, @item_id, @pending, @pending_transaction_id,
      @authorized_date, @date, @amount, @iso_currency_code,
      @name,
      @personal_finance_category_json, @location_json, @payment_meta_json, @raw_json,
      datetime('now')
    )
    ON CONFLICT(transaction_id) DO UPDATE SET
      account_id=excluded.account_id,
      item_id=excluded.item_id,
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
  });

  const txn = db.transaction(() => {
    for (const t of added) insertedOrUpdated += upsertTx.run(normalize(t)).changes;
    for (const t of modified) insertedOrUpdated += upsertTx.run(normalize(t)).changes;
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

module.exports = { upsertTransactions, upsertItem, getItemIdByAccessToken, getLatestItem, getLatestValidItem, getTransactionsPersistenceDebug };
