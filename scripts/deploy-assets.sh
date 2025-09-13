#!/bin/bash

# Helper to build frontend and deploy assets canister
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚧 Deploying frontend assets canister"

# Try to run npm build if npm is available
if command -v npm > /dev/null 2>&1; then
  echo "📦 Running npm ci && npm run build"
  npm ci
  npm run build
else
  echo "ℹ️ npm not found in PATH — skipping build. Ensure 'dist' exists and is up-to-date."
fi

echo "🟢 Starting dfx (background) if not running"
if ! pgrep -f "dfx" > /dev/null 2>&1; then
  dfx start --background
fi

echo "📁 Deploying frontend_assets canister (local)"
dfx deploy frontend_assets || {
  echo "⚠️ Deploy to local failed, attempting network deploy to ic"
  dfx build --network ic
  dfx deploy --network ic
}

echo "✅ Done."
