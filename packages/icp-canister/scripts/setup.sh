#!/bin/bash

# Dhaniverse ICP Canister Setup Script
# Run this script to set up the development environment

set -e

echo "🚀 Setting up Dhaniverse ICP Canister Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if DFX is installed
if ! command -v dfx &> /dev/null; then
    print_error "DFX is not installed. Installing..."
    sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
    export PATH="$HOME/bin:$PATH"
else
    print_status "DFX is installed ($(dfx --version))"
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    print_error "Rust is not installed. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
else
    print_status "Rust is installed ($(cargo --version))"
fi

# Add wasm32 target
print_status "Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed. Please install Node.js 18+ manually."
else
    print_status "Node.js is installed ($(node --version))"
fi

# Navigate to canister directory
cd "$(dirname "$0")/.."

# Install Rust dependencies
print_status "Installing Rust dependencies..."
cargo check

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
# Dhaniverse ICP Canister Environment Variables
CANISTER_ID_DHANIVERSE_BACKEND=dzbzg-eqaaa-aaaap-an3rq-cai
NETWORK=ic
DFX_VERSION=$(dfx --version | cut -d' ' -f2)
EOF
fi

# Check network connectivity
print_status "Testing IC network connectivity..."
if dfx ping ic > /dev/null 2>&1; then
    print_status "IC network is reachable"
else
    print_warning "IC network is not reachable. Check your internet connection."
fi

# Display current identity
print_status "Current DFX identity: $(dfx identity whoami)"
print_status "Principal ID: $(dfx identity get-principal)"

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Create your own identity:"
echo "   dfx identity new [your-name]"
echo "   dfx identity use [your-name]"
echo ""
echo "2. For local development:"
echo "   dfx start --clean --background"
echo "   dfx deploy --network local"
echo ""
echo "3. For mainnet deployment:"
echo "   dfx build --network ic"
echo "   dfx deploy --network ic"
echo ""
echo "4. Test the canister:"
echo "   dfx canister call dhaniverse_backend health_check"
echo ""
echo "📚 Read the full documentation in README.md"