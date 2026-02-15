#!/usr/bin/env python3
import re
import subprocess
import sys
from pathlib import Path


PATTERNS = [
    ("Plaid access token", re.compile(r"access-[A-Za-z0-9_-]+-[A-Za-z0-9_-]+")),
    ("Hardcoded PLAID_SECRET", re.compile(r"\bPLAID_SECRET\s*=\s*[^ \t\r\n#][^\r\n]*")),
    ("Hardcoded PLAID_CLIENT_ID", re.compile(r"\bPLAID_CLIENT_ID\s*=\s*[^ \t\r\n#][^\r\n]*")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub token", re.compile(r"\bghp_[A-Za-z0-9]{20,}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Stripe key", re.compile(r"\bsk_(live|test)_[A-Za-z0-9]{16,}\b")),
    ("Private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]

BLOCKED_PATH_PATTERNS = [
    re.compile(r"^data-layer/raw/.*\.(db|sqlite|sqlite3)$"),
]


def run(cmd):
    return subprocess.check_output(cmd, text=True, encoding="utf-8", errors="replace")


def staged_files():
    out = run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    return [line.strip() for line in out.splitlines() if line.strip()]


def added_lines(path):
    out = run(["git", "diff", "--cached", "-U0", "--", path])
    lines = []
    for line in out.splitlines():
        if line.startswith("+++ "):
            continue
        if line.startswith("+"):
            lines.append(line[1:])
    return lines


def is_likely_binary(path):
    p = Path(path)
    if not p.exists() or p.is_dir():
        return True
    try:
        data = p.read_bytes()
    except Exception:
        return True
    if b"\x00" in data:
        return True
    return False


def main():
    findings = []
    blocked_paths = []
    for path in staged_files():
        normalized = path.replace("\\", "/")
        if any(p.search(normalized) for p in BLOCKED_PATH_PATTERNS):
            blocked_paths.append(path)
            continue
        if is_likely_binary(path):
            continue
        try:
            lines = added_lines(path)
        except subprocess.CalledProcessError:
            continue
        for idx, line in enumerate(lines, start=1):
            for label, pattern in PATTERNS:
                if pattern.search(line):
                    findings.append((path, idx, label, line.strip()))

    if blocked_paths:
        print("Secret scan failed. Raw database artifacts cannot be committed:")
        for path in blocked_paths:
            print(f"- {path}")
        print("Commit blocked. Keep raw DB files in ignored paths only.")
        return 1

    if findings:
        print("Secret scan failed. Potential secrets detected in staged changes:")
        for path, idx, label, line in findings:
            preview = line[:160]
            print(f"- {path} (added-line #{idx}): {label}: {preview}")
        print("Commit blocked. Remove or redact secrets, then retry.")
        return 1

    print("Secret scan passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
