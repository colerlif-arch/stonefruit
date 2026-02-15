param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CommitArgs
)

if ($CommitArgs.Count -eq 0) {
  Write-Error "Usage: powershell -NoProfile -File scripts/safe_commit.ps1 -m ""message"""
  exit 2
}

python scripts/check_secrets.py
if ($LASTEXITCODE -ne 0) {
  Write-Error "Secret/path scan failed. Commit aborted."
  exit $LASTEXITCODE
}

git commit @CommitArgs
exit $LASTEXITCODE
