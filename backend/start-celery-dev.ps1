# Celery worker for local dev (Windows: pool solo avoids prefork issues).
# From repo:  cd backend; .\start-celery-dev.ps1
# Requires: Redis up, backend/.env with REDIS_URL / Celery settings aligned with Django.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$pool = if ($env:OS -match "Windows") { "solo" } else { "prefork" }

if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv run celery -A config worker --loglevel=info --pool=$pool
}
elseif (Test-Path ".\.venv\Scripts\celery.exe") {
    & .\.venv\Scripts\celery.exe -A config worker --loglevel=info --pool=$pool
}
else {
    celery -A config worker --loglevel=info --pool=$pool
}
