#!/usr/bin/env python3
import argparse
import json
import sqlite3
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="SQLite CLI helper for Stonefruit")
    parser.add_argument(
        "--db",
        default="data-layer/raw/plaid.db",
        help="Path to sqlite database file (default: data-layer/raw/plaid.db)",
    )
    parser.add_argument("--tables", action="store_true", help="List tables")
    parser.add_argument("--schema", nargs="?", const="", help="Show schema (optionally for one table)")
    parser.add_argument("--query", help="Run SQL query")
    parser.add_argument("--json", action="store_true", help="Print result rows as JSON")
    parser.add_argument("--limit", type=int, default=100, help="Max rows printed (default: 100)")
    return parser.parse_args()


def print_rows(rows, as_json):
    if as_json:
        print(json.dumps(rows, indent=2, default=str))
        return
    if not rows:
        print("(no rows)")
        return
    cols = list(rows[0].keys())
    print(" | ".join(cols))
    print("-+-".join("-" * len(c) for c in cols))
    for row in rows:
        print(" | ".join(str(row[c]) if row[c] is not None else "NULL" for c in cols))


def main():
    args = parse_args()
    db_path = Path(args.db)
    if not db_path.exists():
        print(f"Database file not found: {db_path}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    try:
        did_work = False
        if args.tables:
            did_work = True
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            rows = [dict(r) for r in cur.fetchall()]
            print_rows(rows, args.json)

        if args.schema is not None:
            did_work = True
            if args.schema:
                cur.execute(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
                    (args.schema,),
                )
            else:
                cur.execute(
                    "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name"
                )
            rows = [dict(r) for r in cur.fetchall()]
            print_rows(rows, args.json)

        if args.query:
            did_work = True
            cur.execute(args.query)
            if cur.description is None:
                conn.commit()
                print("OK")
            else:
                rows = [dict(r) for r in cur.fetchmany(args.limit)]
                print_rows(rows, args.json)

        if not did_work:
            print("No action provided. Use --tables, --schema, or --query.")
            return 2
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
