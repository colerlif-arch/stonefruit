param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ArgsFromUser
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliPath = Join-Path $scriptDir "sqlite_cli.py"

python $cliPath @ArgsFromUser
exit $LASTEXITCODE
