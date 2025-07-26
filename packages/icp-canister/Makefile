# Makefile for Rust ICP Canister

.PHONY: help build test clean deploy-local deploy-ic upgrade lint format check-format

# Default target
help:
	@echo "🚀 Dhaniverse Rust ICP Canister"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@echo "  build         - Build the canister"
	@echo "  test          - Run all tests"
	@echo "  test-unit     - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  clean         - Clean build artifacts"
	@echo "  deploy-local  - Deploy to local replica"
	@echo "  deploy-ic     - Deploy to IC mainnet"
	@echo "  upgrade-local - Upgrade local canister"
	@echo "  upgrade-ic    - Upgrade IC canister"
	@echo "  lint          - Run clippy linter"
	@echo "  format        - Format code with rustfmt"
	@echo "  check-format  - Check code formatting"
	@echo "  candid        - Generate Candid interface"
	@echo "  docs          - Generate documentation"
	@echo ""

# Build targets
build:
	@echo "🔨 Building canister..."
	@rustup target add wasm32-unknown-unknown
	@cargo build --target wasm32-unknown-unknown --release
	@echo "✅ Build complete"

candid:
	@echo "📝 Generating Candid interface..."
	@cargo run --bin generate_candid > rust_icp_canister.did
	@echo "✅ Candid interface generated"

# Test targets
test: test-unit test-integration

test-unit:
	@echo "🧪 Running unit tests..."
	@cargo test --lib
	@echo "✅ Unit tests complete"

test-integration:
	@echo "🔗 Running integration tests..."
	@cargo build --target wasm32-unknown-unknown --release
	@cargo test --test integration_tests
	@echo "✅ Integration tests complete"

# Deployment targets
deploy-local:
	@echo "🏠 Deploying to local replica..."
	@./deploy-local.sh
	@echo "✅ Local deployment complete"

deploy-ic:
	@echo "🌐 Deploying to IC mainnet..."
	@./deploy-ic.sh
	@echo "✅ IC deployment complete"

# Upgrade targets
upgrade-local:
	@echo "🔄 Upgrading local canister..."
	@./upgrade-canister.sh --network local
	@echo "✅ Local upgrade complete"

upgrade-ic:
	@echo "🔄 Upgrading IC canister..."
	@./upgrade-canister.sh --network ic --backup
	@echo "✅ IC upgrade complete"

# Code quality targets
lint:
	@echo "🔍 Running clippy linter..."
	@cargo clippy --all-targets --all-features -- -D warnings
	@echo "✅ Linting complete"

format:
	@echo "🎨 Formatting code..."
	@cargo fmt
	@echo "✅ Formatting complete"

check-format:
	@echo "🔍 Checking code formatting..."
	@cargo fmt -- --check
	@echo "✅ Format check complete"

# Documentation
docs:
	@echo "📚 Generating documentation..."
	@cargo doc --no-deps --open
	@echo "✅ Documentation generated"

# Cleanup
clean:
	@echo "🧹 Cleaning build artifacts..."
	@cargo clean
	@rm -f rust_icp_canister.did
	@echo "✅ Cleanup complete"

# Development workflow
dev: clean build test lint
	@echo "✅ Development workflow complete"

# CI/CD workflow
ci: clean build test-unit lint check-format
	@echo "✅ CI workflow complete"

# Release workflow
release: clean build test candid
	@echo "✅ Release workflow complete"

# Quick start for new developers
setup:
	@echo "🚀 Setting up development environment..."
	@rustup target add wasm32-unknown-unknown
	@cargo install pocket-ic || echo "PocketIC installation failed (optional)"
	@echo "✅ Setup complete"

# Performance benchmarks
bench:
	@echo "⚡ Running benchmarks..."
	@cargo bench
	@echo "✅ Benchmarks complete"

# Security audit
audit:
	@echo "🔒 Running security audit..."
	@cargo audit
	@echo "✅ Security audit complete"

# Check all (comprehensive check before commit)
check-all: clean build test lint check-format audit
	@echo "✅ All checks passed - ready to commit!"