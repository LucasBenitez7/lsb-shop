#!/usr/bin/env bash
# Railway Release Phase script — runs BEFORE container starts (web/worker/beat).
# Exits 1 on failure → Railway aborts deployment (safe rollback).

set -e

echo "[Release] Running Django migrations..."
uv run --no-dev python manage.py migrate --noinput

echo "[Release] Collecting static files..."
uv run --no-dev python manage.py collectstatic --noinput --clear

echo "[Release] Success. Starting service..."
