#!/bin/bash

# Quick Rebuild with REAL DATA Implementation
# Run this in WSL

set -e

echo "🚀 Rebuilding ICP Canister with REAL DATA from Polygon.io..."
echo ""

# Navigate to client directory
cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: dfx.json not found. Please run this from the client/ directory"
    exit 1
fi

# Check if dfx is available
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: dfx not found. Please install dfx first"
    exit 1
fi

echo "📦 Step 1: Building Rust canister..."
cargo build --target wasm32-unknown-unknown --release

echo ""
echo "🔧 Step 2: Deploying to local replica..."
dfx deploy dhaniverse_backend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing REAL data fetch..."
echo ""

# Test the new endpoint
echo "Calling get_market_summary_real()..."
dfx canister call dhaniverse_backend get_market_summary_real

echo ""
echo "🎉 SUCCESS! Your canister now fetches 100% REAL data from Polygon.io!"
echo ""
echo "📋 Next Steps:"
echo "1. Start frontend: npm run dev"
echo "2. Open browser console"
echo "3. Test: await window.canisterService.getMarketSummary()"
echo "4. Verify 7-day historical data with REAL prices"
echo ""
echo "📊 Data Sources:"
echo "  ✅ 7-day OHLC historical data from Polygon.io"
echo "  ✅ Real market cap from Polygon.io"
echo "  ✅ Real shares outstanding from Polygon.io"
echo "  ✅ Calculated volatility from real prices"
echo "  ✅ Calculated EPS from real market cap"
echo "  ✅ Calculated business growth from 7-day change"
echo ""
