
# Centralized Makefile for Dhaniverse Project

# Variables
RUST_CANISTER_PATH := packages/icp-canister
DFX_START_HOST := 127.0.0.1:4943

.PHONY: all build build-bat clean deploy-local deploy-local-bat deploy-ic deploy-dhaniverse-backend-local deploy-dhaniverse-backend-ic upgrade-canister-local upgrade-canister-ic start-dfx-clean stop-dfx test-local test-ic start-servers fix-dfx deploy-canisters help

all: build

# Build the Rust canister
build:
	@echo "Building Rust canister..."
	@cd $(RUST_CANISTER_PATH) && cargo build --target wasm32-unknown-unknown --release
	@echo "Build complete."

# Build the Rust canister (Windows)
build-bat:
	@echo "Building Rust canister (Windows)..."
	@cd $(RUST_CANISTER_PATH) && rustup target add wasm32-unknown-unknown && cargo clean && cargo build --target wasm32-unknown-unknown --release && cargo run --bin generate_candid > rust_icp_canister.did && cargo test
	@echo "Build complete."

# Clean the project
clean:
	@echo "Cleaning project..."
	@cd $(RUST_CANISTER_PATH) && cargo clean
	@rm -f $(RUST_CANISTER_PATH)/rust_icp_canister.did
	@echo "Clean complete."

# Deploy the canister locally
deploy-local:
	@echo "Deploying canister locally..."
	dfx deploy --network local
	@echo "Local deployment complete."

# Deploy the canister locally (Windows)
deploy-local-bat:
	@echo "Deploying canister locally (Windows)..."
	@cd $(RUST_CANISTER_PATH) && rustup target add wasm32-unknown-unknown && cargo clean && cargo build --target wasm32-unknown-unknown --release
	@cd ..\.. && dfx start --clean --background && dfx deploy dhaniverse_backend && dfx generate dhaniverse_backend && dfx canister call dhaniverse_backend health_check && dfx canister call dhaniverse_backend get_available_wallets
	@echo "Local deployment complete."

# Deploy the canister to IC
deploy-ic:
	@echo "Deploying canister to IC..."
	dfx deploy --network ic
	@echo "IC deployment complete."

# Deploy the dhaniverse_backend canister locally
deploy-dhaniverse-backend-local:
	@echo "Deploying dhaniverse_backend canister locally..."
	dfx deploy dhaniverse_backend --network local
	@echo "Local deployment of dhaniverse_backend complete."

# Deploy the dhaniverse_backend canister to IC
deploy-dhaniverse-backend-ic:
	@echo "Deploying dhaniverse_backend canister to IC..."
	dfx deploy dhaniverse_backend --network ic
	@echo "IC deployment of dhaniverse_backend complete."

# Upgrade the canister locally
upgrade-canister-local:
	@echo "Upgrading canister locally..."
	dfx canister install $(RUST_CANISTER_PATH) --mode upgrade --network local
	@echo "Local canister upgrade complete."

# Upgrade the canister to IC
upgrade-canister-ic:
	@echo "Upgrading canister to IC..."
	dfx canister install $(RUST_CANISTER_PATH) --mode upgrade --network ic
	@echo "IC canister upgrade complete."

# Start DFX clean
start-dfx-clean:
	@echo "Starting DFX clean..."
	dfx start --clean --background --host $(DFX_START_HOST)
	@echo "DFX started."

# Stop DFX
stop-dfx:
	@echo "Stopping DFX..."
	dfx stop
	@echo "DFX stopped."

# Test the canister locally
test-local:
	@echo "Testing canister locally..."
	dfx canister call dhaniverse_backend healthCheck
	dfx canister call dhaniverse_backend createAccount '("test-principal-123")'
	dfx canister call dhaniverse_backend fetchStockPrice '("AAPL")'
	dfx canister call dhaniverse_backend fetchFinancialNews
	dfx canister call dhaniverse_backend updateStockPricesFromAPI
	@echo "Local tests complete."

# Test the canister on IC
test-ic:
	@echo "Testing canister on IC..."
	dfx canister call dhaniverse_backend healthCheck --network ic
	@echo "IC tests complete."

# Start the game and WebSocket servers
start-servers:
	@echo "Starting servers..."
	@start "Game Server" cmd /k "cd /d $(shell pwd) && npm run server:game"
	@start "WebSocket Server" cmd /k "cd /d $(shell pwd) && npm run server:ws"
	@echo "Servers started."

# Fix DFX issues (Windows)
fix-dfx:
	@echo "Fixing DFX..."
	dfx stop
	rm -rf .dfx
	@FOR /f "tokens=5" %%a in ('netstat -aon ^| findstr :4943') DO taskkill /f /pid %%a
	@FOR /f "tokens=5" %%a in ('netstat -aon ^| findstr :35245') DO taskkill /f /pid %%a
	dfx start --clean --background
	@echo "DFX fixed."

# Deploy all canisters (Windows)
deploy-canisters:
	@echo "Deploying canisters..."
	dfx deploy internet_identity
	dfx deploy dhaniverse
	@echo "Canisters deployed."

# Help
help:
	@echo "Available targets:"
	@echo "  all: Build the canister"
	@echo "  build: Build the canister"
	@echo "  build-bat: Build the canister (Windows)"
	@echo "  clean: Clean build artifacts"
	@echo "  deploy-local: Deploy the canister to the local replica"
	@echo "  deploy-local-bat: Deploy the canister to the local replica (Windows)"
	@echo "  deploy-ic: Deploy the canister to the IC mainnet"
	@echo "  deploy-dhaniverse-backend-local: Deploy the dhaniverse_backend canister to the local replica"
	@echo "  deploy-dhaniverse-backend-ic: Deploy the dhaniverse_backend canister to the IC mainnet"
	@echo "  upgrade-canister-local: Upgrade the canister on the local replica"
	@echo "  upgrade-canister-ic: Upgrade the canister on the IC mainnet"
	@echo "  start-dfx-clean: Start DFX with a clean state"
	@echo "  stop-dfx: Stop the DFX local replica"
	@echo "  test-local: Run tests on the local replica"
	@echo "  test-ic: Run tests on the IC mainnet"
	@echo "  start-servers: Start the game and WebSocket servers"
	@echo "  fix-dfx: Fix DFX issues (Windows)"
	@echo "  deploy-canisters: Deploy all canisters (Windows)"
	@echo "  help: Show this help message"
