#!/bin/bash

# Helper to build web client (landing page) and deploy to IC with custom domain
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚧 Deploying landing page to IC with custom domain dhaniverse.in"

# Build the web client (Next.js landing page)
if command -v npm > /dev/null 2>&1; then
  echo "📦 Building web client (landing page)"
  cd web
  npm ci
  npm run build
  cd ..
else
  echo "ℹ️ npm not found in PATH — skipping build. Ensure 'web/out' exists and is up-to-date."
fi

echo "🟢 Starting dfx (background) if not running"
if ! pgrep -f "dfx" > /dev/null 2>&1; then
  dfx start --background
fi

echo "📁 Deploying landing_page canister to IC"
dfx build --network ic
dfx deploy --network ic landing_page

echo "🌐 Landing page deployed! Configure custom domain dhaniverse.in in IC dashboard"
echo "📋 Canister URL: https://$(dfx canister --network ic id landing_page).ic0.app"

echo "✅ Done."
