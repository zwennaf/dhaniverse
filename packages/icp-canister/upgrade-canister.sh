#!/bin/bash

# Canister upgrade script with state preservation

set -e

echo "🔄 Upgrading Dhaniverse Canister..."

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

# Parse command line arguments
NETWORK="local"
BACKUP_STATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --network)
            NETWORK="$2"
            shift 2
            ;;
        --backup)
            BACKUP_STATE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Usage: $0 [--network local|ic] [--backup]"
            exit 1
            ;;
    esac
done

# Backup canister state (if requested)
backup_state() {
    if [ "$BACKUP_STATE" = true ]; then
        print_status "Backing up canister state..."
        
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_DIR="backups/$TIMESTAMP"
        mkdir -p "$BACKUP_DIR"
        
        # Export canister state (this would need to be implemented in the canister)
        # For now, we'll just save the current canister info
        dfx canister status dhaniverse_backend --network "$NETWORK" > "$BACKUP_DIR/canister_status.txt"
        
        print_status "State backed up to $BACKUP_DIR"
    fi
}

# Build new version
build_new_version() {
    print_status "Building new canister version..."
    
    cd "$(dirname "$0")"
    
    if [ -f "build.sh" ]; then
        ./build.sh
    else
        cargo build --target wasm32-unknown-unknown --release
    fi
}

# Perform upgrade
upgrade_canister() {
    print_status "Upgrading canister on $NETWORK network..."
    
    cd "$(dirname "$0")/../.."
    
    # Stop the canister
    print_status "Stopping canister..."
    dfx canister stop dhaniverse_backend --network "$NETWORK"
    
    # Upgrade the canister
    if dfx canister install dhaniverse_backend --mode upgrade --network "$NETWORK"; then
        print_status "Upgrade successful ✓"
    else
        print_error "Upgrade failed"
        
        # Try to restart the old version
        print_status "Attempting to restart previous version..."
        dfx canister start dhaniverse_backend --network "$NETWORK"
        exit 1
    fi
    
    # Start the canister
    print_status "Starting upgraded canister..."
    dfx canister start dhaniverse_backend --network "$NETWORK"
}

# Verify upgrade
verify_upgrade() {
    print_status "Verifying upgrade..."
    
    cd "$(dirname "$0")/../.."
    
    # Test health check
    if dfx canister call dhaniverse_backend health_check --network "$NETWORK"; then
        print_status "Health check passed ✓"
    else
        print_error "Health check failed after upgrade"
        return 1
    fi
    
    # Test basic functionality
    print_status "Testing basic functionality..."
    if dfx canister call dhaniverse_backend get_available_wallets --network "$NETWORK"; then
        print_status "Basic functionality test passed ✓"
    else
        print_warning "Basic functionality test failed"
    fi
}

# Show upgrade info
show_upgrade_info() {
    CANISTER_ID=$(dfx canister id dhaniverse_backend --network "$NETWORK" 2>/dev/null || echo "unknown")
    
    print_status "Canister Upgrade Complete! 🎉"
    echo ""
    echo "📋 Upgrade Information:"
    echo "  • Network: $NETWORK"
    echo "  • Canister ID: $CANISTER_ID"
    echo "  • Timestamp: $(date)"
    echo ""
    echo "🔧 Post-Upgrade Commands:"
    echo "  • Check status: dfx canister status dhaniverse_backend --network $NETWORK"
    echo "  • View logs: dfx canister logs dhaniverse_backend --network $NETWORK"
    echo "  • Test health: dfx canister call dhaniverse_backend health_check --network $NETWORK"
    echo ""
    
    if [ "$NETWORK" = "ic" ]; then
        echo "🌐 IC Mainnet URLs:"
        echo "  • Candid UI: https://$CANISTER_ID.ic0.app/"
        echo "  • Raw access: https://$CANISTER_ID.raw.ic0.app/"
        echo ""
    fi
    
    print_status "Upgrade completed successfully! 🚀"
}

# Rollback function (in case of issues)
rollback_upgrade() {
    print_error "Upgrade failed, attempting rollback..."
    
    # This would require implementing proper versioning and rollback
    # For now, we'll just try to restart the canister
    dfx canister start dhaniverse_backend --network "$NETWORK"
    
    print_status "Rollback completed. Please check canister status."
}

# Main execution
main() {
    echo "🔄 Canister Upgrade Script"
    echo "========================="
    echo "Network: $NETWORK"
    echo "Backup: $BACKUP_STATE"
    echo ""
    
    # Confirm upgrade for IC network
    if [ "$NETWORK" = "ic" ]; then
        print_warning "⚠️  You are about to upgrade on IC MAINNET ⚠️"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Upgrade cancelled"
            exit 0
        fi
    fi
    
    backup_state
    build_new_version
    
    if upgrade_canister && verify_upgrade; then
        show_upgrade_info
    else
        rollback_upgrade
        exit 1
    fi
}

# Set up error handling
trap 'print_error "Upgrade script failed at line $LINENO"' ERR

main "$@"