#!/bin/bash

# Generate ICP Canister Declarations
echo "🔧 Generating ICP Canister Declarations..."

# Navigate to canister directory
cd packages/icp-canister

# Generate declarations for the IC network
echo "📡 Generating declarations for mainnet canister..."
dfx generate --network ic dhaniverse_backend

# Copy declarations to src folder for frontend access
echo "📁 Copying declarations to frontend..."
mkdir -p ../../src/declarations
cp -r src/declarations/* ../../src/declarations/

# Navigate back to client root
cd ../..

echo "✅ Declarations generated successfully!"
echo ""
echo "📋 Generated files:"
echo "  - src/declarations/dhaniverse_backend/dhaniverse_backend.did.js"
echo "  - src/declarations/dhaniverse_backend/dhaniverse_backend.did.d.ts"
echo "  - src/declarations/dhaniverse_backend/index.js"
echo ""
echo "🔗 Canister Information:"
echo "  - Canister ID: 2v55c-vaaaa-aaaas-qbrpq-cai"
echo "  - Network: IC Mainnet"
echo "  - URL: https://2v55c-vaaaa-aaaas-qbrpq-cai.icp0.io/"
echo "  - Candid UI: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=2v55c-vaaaa-aaaas-qbrpq-cai"