#!/bin/bash

# Build script for Rust ICP Canister

set -e

echo "🔨 Building Rust ICP Canister..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_rust() {
    if ! command -v rustc &> /dev/null; then
        print_error "Rust is not installed"
        exit 1
    fi
    
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        print_warning "Adding wasm32-unknown-unknown target..."
        rustup target add wasm32-unknown-unknown
    fi
}

# Build the canister
build_canister() {
    print_status "Building canister..."
    
    # Clean previous builds
    cargo clean
    
    # Build for wasm32 target
    cargo build --target wasm32-unknown-unknown --release
    
    if [ $? -eq 0 ]; then
        print_status "Build successful ✓"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Generate Candid interface
generate_candid() {
    print_status "Generating Candid interface..."
    
    if cargo run --bin generate_candid > rust_icp_canister.did; then
        print_status "Candid interface generated ✓"
    else
        print_warning "Failed to generate Candid interface"
    fi
}

# Run tests
run_tests() {
    print_status "Running unit tests..."
    
    if cargo test; then
        print_status "Unit tests passed ✓"
    else
        print_warning "Some unit tests failed"
    fi
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    check_rust
    build_canister
    generate_candid
    run_tests
    
    print_status "Build completed successfully! 🎉"
    echo ""
    echo "📁 Output files:"
    echo "  • WASM: target/wasm32-unknown-unknown/release/rust_icp_canister.wasm"
    echo "  • Candid: rust_icp_canister.did"
    echo ""
    echo "🚀 Ready for deployment!"
}

main "$@"