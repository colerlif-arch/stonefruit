param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PushArgs
)

$blocked = git ls-files -- "data-layer/raw/*.db" "data-layer/raw/*.sqlite" "data-layer/raw/*.sqlite3"
if ($blocked) {
  Write-Error "Push blocked: raw database files are tracked in Git:"
  $blocked | ForEach-Object { Write-Host " - $_" }
  Write-Host "Remove from tracking first, then push again."
  exit 1
}

git push @PushArgs
exit $LASTEXITCODE
