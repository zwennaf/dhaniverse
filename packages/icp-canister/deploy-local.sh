#!/bin/bash

# Dhaniverse Rust ICP Canister - Local Deployment Script

set -e

echo "🚀 Starting Dhaniverse Rust ICP Canister deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v rustc &> /dev/null; then
        print_error "Rust is not installed. Please install Rust first."
        exit 1
    fi
    
    if ! command -v dfx &> /dev/null; then
        print_error "DFX is not installed. Please install DFX first."
        exit 1
    fi
    
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        print_warning "wasm32-unknown-unknown target not found. Installing..."
        rustup target add wasm32-unknown-unknown
    fi
    
    print_status "Prerequisites check completed ✓"
}

# Build the Rust canister
build_canister() {
    print_status "Building Rust canister..."
    
    cd "$(dirname "$0")"
    
    # Clean previous builds
    cargo clean
    
    # Build the canister
    if cargo build --target wasm32-unknown-unknown --release; then
        print_status "Rust canister built successfully ✓"
    else
        print_error "Failed to build Rust canister"
        exit 1
    fi
    
    cd - > /dev/null
}

# Start DFX if not running
start_dfx() {
    print_status "Checking DFX status..."
    
    if ! dfx ping > /dev/null 2>&1; then
        print_status "Starting DFX local replica..."
        dfx start --clean --background
        
        # Wait for DFX to be ready
        print_status "Waiting for DFX to be ready..."
        sleep 5
        
        # Verify DFX is running
        if ! dfx ping > /dev/null 2>&1; then
            print_error "Failed to start DFX"
            exit 1
        fi
    else
        print_status "DFX is already running ✓"
    fi
}

# Deploy the canister
deploy_canister() {
    print_status "Deploying canister to local replica..."
    
    # Navigate to project root
    cd "$(dirname "$0")/../.."
    
    # Deploy the canister
    if dfx deploy dhaniverse_backend; then
        print_status "Canister deployed successfully ✓"
    else
        print_error "Failed to deploy canister"
        exit 1
    fi
    
    # Generate declarations
    print_status "Generating declarations..."
    dfx generate dhaniverse_backend
    
    cd - > /dev/null
}

# Test the deployed canister
test_canister() {
    print_status "Testing deployed canister..."
    
    cd "$(dirname "$0")/../.."
    
    # Test health check
    print_status "Testing health check..."
    if dfx canister call dhaniverse_backend health_check; then
        print_status "Health check passed ✓"
    else
        print_warning "Health check failed"
    fi
    
    # Test get available wallets
    print_status "Testing get available wallets..."
    if dfx canister call dhaniverse_backend get_available_wallets; then
        print_status "Get available wallets test passed ✓"
    else
        print_warning "Get available wallets test failed"
    fi
    
    cd - > /dev/null
}

# Display deployment information
show_info() {
    print_status "Deployment completed successfully! 🎉"
    echo ""
    echo "📋 Deployment Information:"
    echo "  • Canister Name: dhaniverse_backend"
    echo "  • Network: local"
    echo "  • Candid Interface: packages/icp-canister/rust_icp_canister.did"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  • Test health: dfx canister call dhaniverse_backend health_check"
    echo "  • Get wallets: dfx canister call dhaniverse_backend get_available_wallets"
    echo "  • View logs: dfx canister logs dhaniverse_backend"
    echo "  • Check status: dfx canister status dhaniverse_backend"
    echo ""
    echo "📚 Documentation: packages/icp-canister/README.md"
    echo ""
    print_status "Happy coding! 🚀"
}

# Main execution
main() {
    echo "🔧 Dhaniverse Rust ICP Canister - Local Deployment"
    echo "=================================================="
    echo ""
    
    check_prerequisites
    build_canister
    start_dfx
    deploy_canister
    test_canister
    show_info
}

# Run main function
main "$@"