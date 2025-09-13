#!/bin/bash

# Safe IC Network Deployment Script for Dhaniverse Frontend Assets
# This script includes cycle checking and cost estimation to prevent overspending

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CANISTER_NAME="frontend_assets"
IDENTITY_NAME="dhaniverse-deploy"
MIN_CYCLES_REQUIRED=5000000000000  # 5T cycles (conservative estimate)
SAFETY_BUFFER=2000000000000        # 2T cycles safety buffer

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

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
    echo "=================================="
}

# Function to convert cycles to readable format
format_cycles() {
    local cycles=$1
    if (( cycles >= 1000000000000 )); then
        echo "$(( cycles / 1000000000000 ))T cycles"
    elif (( cycles >= 1000000000 )); then
        echo "$(( cycles / 1000000000 ))B cycles"
    elif (( cycles >= 1000000 )); then
        echo "$(( cycles / 1000000 ))M cycles"
    else
        echo "${cycles} cycles"
    fi
}

# Function to estimate deployment costs
estimate_costs() {
    local dist_size
    dist_size=$(du -sb dist 2>/dev/null | cut -f1 || echo "0")
    
    print_header "COST ESTIMATION"
    
    echo "Frontend Assets Analysis:"
    echo "  - Total size: $(( dist_size / 1024 / 1024 )) MB ($(format_cycles $dist_size) bytes)"
    echo "  - Files: $(find dist -type f | wc -l | tr -d ' ') files"
    
    # Cost breakdown (based on IC pricing as of 2024)
    local storage_cost=$(( dist_size * 5 ))  # ~5 cycles per byte for storage
    local creation_cost=1000000000000        # ~1T cycles for canister creation
    local deployment_cost=500000000000       # ~500B cycles for deployment operations
    
    local total_estimated=$(( storage_cost + creation_cost + deployment_cost ))
    
    echo ""
    echo "Estimated Costs:"
    echo "  - Canister creation: $(format_cycles $creation_cost)"
    echo "  - Storage (first year): $(format_cycles $storage_cost)"
    echo "  - Deployment operations: $(format_cycles $deployment_cost)"
    echo "  - TOTAL ESTIMATED: $(format_cycles $total_estimated)"
    echo "  - With safety buffer: $(format_cycles $(( total_estimated + SAFETY_BUFFER )))"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    # Check if dfx is installed
    if ! command -v dfx &> /dev/null; then
        print_error "dfx is not installed. Please install it first."
        exit 1
    fi
    print_status "dfx is installed ($(dfx --version))"
    
    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        print_error "dist directory not found. Please run 'npm run build' first."
        exit 1
    fi
    print_status "dist directory found"
    
    # Check IC network connectivity
    if ! dfx ping ic &>/dev/null; then
        print_error "Cannot reach IC network. Check your internet connection."
        exit 1
    fi
    print_status "IC network is reachable"
}

# Function to setup secure identity
setup_identity() {
    print_header "SETTING UP SECURE IDENTITY"
    
    # Check if identity already exists
    if dfx identity list | grep -q "^${IDENTITY_NAME}$"; then
        print_status "Identity '${IDENTITY_NAME}' already exists"
        dfx identity use "${IDENTITY_NAME}"
    else
        print_info "Creating new secure identity: ${IDENTITY_NAME}"
        dfx identity new "${IDENTITY_NAME}"
        dfx identity use "${IDENTITY_NAME}"
        print_status "Created and switched to identity: ${IDENTITY_NAME}"
        
        echo ""
        print_warning "IMPORTANT: Please save your seed phrase securely!"
        print_warning "You'll need to fund this identity with cycles before deployment."
        echo ""
        echo "Your principal ID: $(dfx identity get-principal)"
        echo ""
        echo "To fund this identity, you can:"
        echo "1. Use the cycles faucet: https://faucet.dfinity.org/"
        echo "2. Transfer cycles from another wallet"
        echo "3. Convert ICP to cycles using NNS"
        echo ""
        read -p "Press Enter after funding your identity..."
    fi
}

# Function to check wallet balance
check_wallet_balance() {
    print_header "CHECKING WALLET BALANCE"
    
    # Try to get wallet balance
    local balance
    if balance=$(dfx wallet --network ic balance 2>/dev/null); then
        local cycles_num
        cycles_num=$(echo "$balance" | grep -o '[0-9,]*' | tr -d ',')
        
        print_status "Current balance: $balance"
        
        if (( cycles_num < MIN_CYCLES_REQUIRED )); then
            print_error "Insufficient cycles for deployment!"
            echo "  Required: $(format_cycles $MIN_CYCLES_REQUIRED)"
            echo "  Available: $balance"
            echo ""
            echo "Please add more cycles to your wallet before proceeding."
            exit 1
        else
            print_status "Sufficient cycles available for deployment"
        fi
    else
        print_warning "Could not check wallet balance. Proceeding with caution..."
        echo ""
        read -p "Are you sure you have sufficient cycles? (y/N): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            print_info "Deployment cancelled. Please fund your wallet and try again."
            exit 0
        fi
    fi
}

# Function to deploy with monitoring
deploy_with_monitoring() {
    print_header "DEPLOYING TO IC NETWORK"
    
    # Create canister first (with cycle monitoring)
    print_info "Creating canister..."
    if dfx canister --network ic create "${CANISTER_NAME}"; then
        print_status "Canister created successfully"
        
        # Get canister ID
        local canister_id
        canister_id=$(dfx canister --network ic id "${CANISTER_NAME}")
        print_info "Canister ID: ${canister_id}"
    else
        print_error "Failed to create canister"
        exit 1
    fi
    
    # Build for IC
    print_info "Building for IC network..."
    if dfx build --network ic "${CANISTER_NAME}"; then
        print_status "Build completed"
    else
        print_error "Build failed"
        exit 1
    fi
    
    # Deploy canister
    print_info "Deploying canister..."
    if dfx deploy --network ic "${CANISTER_NAME}"; then
        print_status "Deployment completed successfully!"
        
        # Show final information
        echo ""
        print_header "DEPLOYMENT SUCCESSFUL"
        echo "Canister ID: ${canister_id}"
        echo "IC URL: https://${canister_id}.ic0.app/"
        echo "Candid UI: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.io/?id=${canister_id}"
        
        # Check remaining balance
        if balance=$(dfx wallet --network ic balance 2>/dev/null); then
            echo "Remaining balance: $balance"
        fi
        
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Function to show final costs
show_final_costs() {
    print_header "FINAL COST SUMMARY"
    
    local canister_id
    canister_id=$(dfx canister --network ic id "${CANISTER_NAME}" 2>/dev/null || echo "unknown")
    
    if [[ "$canister_id" != "unknown" ]]; then
        # Try to get canister status for actual costs
        if canister_status=$(dfx canister --network ic status "${CANISTER_NAME}" 2>/dev/null); then
            echo "Canister Status:"
            echo "$canister_status"
        fi
    fi
}

# Main execution
main() {
    echo "🚀 Dhaniverse Frontend IC Deployment Script"
    echo "============================================="
    echo ""
    
    # Run all checks and estimations
    check_prerequisites
    estimate_costs
    setup_identity
    check_wallet_balance
    
    # Confirm deployment
    echo ""
    print_warning "Ready to deploy to IC mainnet"
    read -p "Do you want to proceed with deployment? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        deploy_with_monitoring
        show_final_costs
        
        echo ""
        print_status "Deployment completed successfully! 🎉"
        echo ""
        echo "Next steps:"
        echo "1. Test your deployment at the IC URL above"
        echo "2. Monitor cycles usage in the NNS or dfx"
        echo "3. Set up automatic top-ups if needed"
        
    else
        print_info "Deployment cancelled by user"
        exit 0
    fi
}

# Run main function
main "$@"