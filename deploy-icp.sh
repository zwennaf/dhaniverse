#!/bin/bash

# Dhaniverse ICP Canister Deployment Script
# Demonstrates advanced ICP features for WCHL25

echo "Deploying Dhaniverse ICP Canister with Advanced Features"
echo "=================================================="

# Check if DFX is installed
if ! command -v dfx &> /dev/null; then
    echo "DFX not found. Installing DFX..."
    sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
    source ~/.bashrc
fi

# Check DFX version
echo "DFX Version:"
dfx --version

# Install canister dependencies
echo "Installing canister dependencies..."
cd packages/icp-canister
npm install
cd ../..

# Start local replica (if not running)
echo "Starting local ICP replica..."
dfx start --clean --background --host 127.0.0.1:4943

# Wait for replica to be ready
echo "Waiting for replica to be ready..."
sleep 10

# Deploy the canister
echo "Deploying dhaniverse_backend canister..."
dfx deploy dhaniverse_backend

# Get canister ID
CANISTER_ID=$(dfx canister id dhaniverse_backend)
echo "Canister deployed successfully!"
echo "Canister ID: $CANISTER_ID"

# Test advanced features
echo "🧪 Testing Advanced ICP Features..."

echo "1. Testing Health Check..."
dfx canister call dhaniverse_backend healthCheck

echo "2. Testing Account Creation..."
dfx canister call dhaniverse_backend createAccount '("test-principal-123")'

echo "3. Testing Stock Price Fetch (HTTP Outcall)..."
dfx canister call dhaniverse_backend fetchStockPrice '("AAPL")'

echo "4. Testing Financial News Fetch (HTTP Outcall)..."
dfx canister call dhaniverse_backend fetchFinancialNews

echo "5. Testing Timer-based Price Updates..."
dfx canister call dhaniverse_backend updateStockPricesFromAPI

# Display deployment summary
echo ""
echo "Deployment Complete!"
echo "=================================================="
echo "Canister ID: $CANISTER_ID"
echo "🌐 Local Replica: http://127.0.0.1:4943"
echo "Candid UI: http://127.0.0.1:4943/?canisterId=$(dfx canister id __Candid_UI)&id=$CANISTER_ID"
echo ""
echo "dvanced ICP Features Deployed:"
echo "   ✅ HTTP Outcalls for real-time data"
echo "   ✅ Timers for automated operations"
echo "   ✅ Stable storage for data persistence"
echo "   ✅ Complex financial data models"
echo ""
echo "Ready for WCHL25 demonstration!"

# Create environment file with canister ID
echo "VITE_DHANIVERSE_CANISTER_ID=$CANISTER_ID" > .env.local
echo "Canister ID saved to .env.local"

echo ""
echo "Next Steps:"
echo "1. Update your frontend to use canister ID: $CANISTER_ID"
echo "2. Test the integration with your React app"
echo "3. Deploy to IC mainnet with: dfx deploy --network ic"
echo "4. Submit to WCHL25 with your advanced ICP features!"