#!/bin/bash

# Complete ICP Deployment Script for Dhaniverse
# This script handles the full deployment process for Linux/WSL

echo "🚀 Starting Dhaniverse ICP Deployment..."
echo "========================================"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install dfx first:"
    echo "   sh -ci \"$(curl -fsSL https://sdk.dfinity.org/install.sh)\""
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ dfx.json not found. Please run this script from the project root."
    exit 1
fi

# Stop any existing dfx processes
echo "🛑 Stopping existing dfx processes..."
dfx stop 2>/dev/null || true

# Start dfx in the background
echo "🔄 Starting dfx local replica..."
dfx start --clean --background

# Wait for dfx to be ready
echo "⏳ Waiting for dfx to be ready..."
sleep 5

# Check if dfx is running
if ! dfx ping > /dev/null 2>&1; then
    echo "❌ dfx failed to start. Please check the logs."
    exit 1
fi

echo "✅ dfx is running!"

# Deploy Internet Identity
echo "🔐 Deploying Internet Identity..."
dfx deps pull
dfx deps deploy

if [ $? -ne 0 ]; then
    echo "⚠️  Internet Identity deployment had issues, but continuing..."
    echo "   You can still test with Plug wallet if available"
fi

# Deploy the main dhaniverse canister
echo "🎮 Deploying Dhaniverse canister..."
dfx deploy dhaniverse

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Dhaniverse canister"
    exit 1
fi

# Frontend will run locally, not deployed to ICP
echo "ℹ️  Frontend will run locally and connect to ICP canisters"

# Configure canister IDs
echo "🔧 Configuring canister IDs..."
chmod +x configure-canisters.sh
./configure-canisters.sh

echo ""
echo "🎉 Deployment Complete!"
echo "======================="

# Get canister IDs for display
DHANIVERSE_ID=$(dfx canister id dhaniverse 2>/dev/null)
II_ID=$(dfx canister id internet_identity 2>/dev/null)

echo "📋 Canister Information:"
echo "   Dhaniverse Backend: $DHANIVERSE_ID"
echo "   Internet Identity: $II_ID"
echo ""
echo "🌐 Access URLs:"
echo "   Internet Identity: http://127.0.0.1:4943/?canisterId=$II_ID"
echo "   Local Frontend: http://localhost:3000 (run with npm run dev)"
echo ""
echo "🔄 Next Steps:"
echo "   1. Restart your development server (npm run dev)"
echo "   2. Open the frontend URL in your browser"
echo "   3. Test wallet connection with Internet Identity"
echo ""
echo "💡 Tip: Use 'dfx logs dhaniverse' to view canister logs"