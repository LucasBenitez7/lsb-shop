# Celery Beat — scheduled tasks (order expiry, cart cleanup, etc.).
# From repo:  cd backend; .\start-celery-beat-dev.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv run celery -A config beat --loglevel=info
}
elseif (Test-Path ".\.venv\Scripts\celery.exe") {
    & .\.venv\Scripts\celery.exe -A config beat --loglevel=info
}
else {
    celery -A config beat --loglevel=info
}
