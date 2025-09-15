#!/usr/bin/env bash
set -euo pipefail

# deploy_and_test_price_history.sh
# Automates local setup and deployment for the dhaniverse_backend canister
# - ensures rustup is installed (asks before installing)
# - adds wasm target wasm32-unknown-unknown
# - starts dfx local replica
# - creates canister if missing
# - builds and reinstalls the canister
# - calls get_price_history

CANISTER_NAME="dhaniverse_backend"
CWD="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CWD"

export PATH="$HOME/.cargo/bin:$PATH"

echo "Working in $CWD"

# Check rustup
if command -v rustup >/dev/null 2>&1; then
  echo "rustup found"
else
  echo "rustup not found.\nThis script can install rustup for you automatically using the official installer."
  read -p "Install rustup now? (y/n) " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    echo "Installing rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    export PATH="$HOME/.cargo/bin:$PATH"
    echo "rustup installed."
  else
    echo "Please install rustup manually and re-run this script: https://rustup.rs"
    exit 1
  fi
fi

# Add wasm target
echo "Adding wasm32-unknown-unknown target (if missing)..."
# Ensure there's a default rust toolchain (rustup may be present but no default set)
if ! rustup show active-toolchain >/dev/null 2>&1; then
  echo "No default Rust toolchain configured. Installing and setting 'stable' as default..."
  rustup install stable
  rustup default stable
fi

rustup target add wasm32-unknown-unknown || true

# Diagnostic: check rust sysroot and presence of wasm std
echo "Rust sysroot: $(rustup run stable rustc --print sysroot 2>/dev/null || true)"
WASM_STD_DIR="$(rustup run stable rustc --print sysroot 2>/dev/null)/lib/rustlib/wasm32-unknown-unknown"
if [ ! -d "$WASM_STD_DIR" ]; then
  echo "Warning: wasm sysroot directory not found: $WASM_STD_DIR"
  echo "Attempting to (re)install rust-std for wasm32-unknown-unknown..."
  rustup component remove rust-std-wasm32-unknown-unknown || true
  rustup component add rust-std-wasm32-unknown-unknown || true
  echo "After reinstall, wasm sysroot: $(rustc +stable --print sysroot 2>/dev/null)/lib/rustlib/wasm32-unknown-unknown"
fi

echo "Which rustc: $(which rustc || true)" 
echo "rustc version: $(rustc --version 2>/dev/null || true)"
echo "Which cargo: $(which cargo || true)"
echo "cargo version: $(cargo --version 2>/dev/null || true)"
echo "Listing wasm lib dir:"
ls -la "$WASM_STD_DIR" || true

# Force stable toolchain for build
export RUSTUP_TOOLCHAIN=stable
# Prefer rustup-managed cargo/rustc for dfx-invoked builds
RUSTUP_CARGO_BIN=$(rustup which cargo --toolchain stable 2>/dev/null || true)
RUSTUP_RUSTC_BIN=$(rustup which rustc --toolchain stable 2>/dev/null || true)
if [ -n "$RUSTUP_CARGO_BIN" ]; then
  export CARGO="$RUSTUP_CARGO_BIN"
fi
if [ -n "$RUSTUP_RUSTC_BIN" ]; then
  export RUSTC="$RUSTUP_RUSTC_BIN"
fi

# Ensure dfx is running
if pgrep -x dfx >/dev/null 2>&1; then
  echo "dfx is already running"
else
  echo "Starting dfx in the background..."
  dfx start --background
fi

# Create the canister id if missing
set +e
CANISTER_ID=$(dfx canister id "$CANISTER_NAME" 2>/dev/null || true)
set -e
if [[ -z "$CANISTER_ID" ]]; then
  echo "Creating canister $CANISTER_NAME..."
  dfx canister create "$CANISTER_NAME"
  CANISTER_ID=$(dfx canister id "$CANISTER_NAME")
fi

echo "Canister id: $CANISTER_ID"

echo "Building canister (this may take a while)..."
dfx build
echo "Installing canister..."
dfx canister install --mode reinstall "$CANISTER_NAME"
# Build canister
echo "Building canister (this may take a while)..."
PATH="$HOME/.cargo/bin:$PATH" RUSTUP_TOOLCHAIN=stable dfx build

# Install/reinstall canister
echo "Installing canister..."
PATH="$HOME/.cargo/bin:$PATH" RUSTUP_TOOLCHAIN=stable dfx canister install --mode reinstall "$CANISTER_NAME"

# Small sleep to allow the replica to register the module
sleep 1

# Call the query
echo "Calling get_price_history... (will print candid output)"
dfx canister call "$CANISTER_NAME" get_price_history || true

echo "Done. If the call fails with IC0537 (no wasm module), re-run the install step above and check build output."
