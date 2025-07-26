#!/bin/bash

# Deploy to IC Mainnet script

set -e

echo "🌐 Deploying to IC Mainnet..."

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
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v dfx &> /dev/null; then
        print_error "DFX is not installed"
        exit 1
    fi
    
    if ! command -v rustc &> /dev/null; then
        print_error "Rust is not installed"
        exit 1
    fi
    
    # Check if user has cycles
    print_warning "Make sure you have sufficient cycles for deployment"
    print_warning "You can get cycles from: https://faucet.dfinity.org/"
}

# Build the canister
build_canister() {
    print_status "Building canister for IC deployment..."
    
    cd "$(dirname "$0")"
    
    # Run build script
    if [ -f "build.sh" ]; then
        ./build.sh
    else
        cargo build --target wasm32-unknown-unknown --release
    fi
}

# Deploy to IC
deploy_to_ic() {
    print_status "Deploying to IC mainnet..."
    
    cd "$(dirname "$0")/../.."
    
    # Check DFX identity
    print_status "Current DFX identity: $(dfx identity whoami)"
    
    # Deploy to IC network
    if dfx deploy --network ic dhaniverse_backend; then
        print_status "Deployment successful ✓"
    else
        print_error "Deployment failed"
        exit 1
    fi
    
    # Get canister ID
    CANISTER_ID=$(dfx canister id dhaniverse_backend --network ic)
    print_status "Canister ID: $CANISTER_ID"
    
    # Generate declarations
    print_status "Generating declarations..."
    dfx generate dhaniverse_backend --network ic
}

# Test deployed canister
test_deployment() {
    print_status "Testing deployed canister..."
    
    cd "$(dirname "$0")/../.."
    
    # Test health check
    if dfx canister call dhaniverse_backend health_check --network ic; then
        print_status "Health check passed ✓"
    else
        print_warning "Health check failed"
    fi
}

# Show deployment info
show_deployment_info() {
    CANISTER_ID=$(dfx canister id dhaniverse_backend --network ic 2>/dev/null || echo "unknown")
    
    print_status "IC Mainnet Deployment Complete! 🎉"
    echo ""
    echo "📋 Deployment Information:"
    echo "  • Network: IC Mainnet"
    echo "  • Canister ID: $CANISTER_ID"
    echo "  • Candid UI: https://$CANISTER_ID.ic0.app/"
    echo "  • Canister URL: https://$CANISTER_ID.raw.ic0.app/"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • Check status: dfx canister status dhaniverse_backend --network ic"
    echo "  • View logs: dfx canister logs dhaniverse_backend --network ic"
    echo "  • Call methods: dfx canister call dhaniverse_backend <method> --network ic"
    echo ""
    echo "💰 Cycles Management:"
    echo "  • Check cycles: dfx canister status dhaniverse_backend --network ic"
    echo "  • Top up cycles: dfx canister deposit-cycles <amount> dhaniverse_backend --network ic"
    echo ""
    print_status "Deployment completed successfully! 🚀"
}

# Confirm deployment
confirm_deployment() {
    echo ""
    print_warning "⚠️  You are about to deploy to IC MAINNET ⚠️"
    print_warning "This will consume cycles and deploy to production"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
}

# Main execution
main() {
    echo "🌐 IC Mainnet Deployment Script"
    echo "==============================="
    echo ""
    
    confirm_deployment
    check_prerequisites
    build_canister
    deploy_to_ic
    test_deployment
    show_deployment_info
}

main "$@"