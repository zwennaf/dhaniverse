# Deployment Guide

This guide provides step-by-step instructions for deploying the Dhaniverse Rust ICP Canister to both local and IC mainnet environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Deployment](#local-deployment)
- [IC Mainnet Deployment](#ic-mainnet-deployment)
- [Canister Upgrade](#canister-upgrade)
- [Troubleshooting](#troubleshooting)
- [Post-Deployment Testing](#post-deployment-testing)

## Prerequisites

### Required Software

1. **Rust Toolchain**
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   
   # Add WebAssembly target
   rustup target add wasm32-unknown-unknown
   ```

2. **DFX (Internet Computer SDK)**
   ```bash
   # Install DFX
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   
   # Verify installation
   dfx --version
   ```

3. **Git** (for version control)
   ```bash
   git --version
   ```

### Optional Tools

- **Make** (for using Makefile commands)
- **PocketIC** (for integration testing)
  ```bash
  cargo install pocket-ic
  ```

## Local Deployment

### Method 1: Automated Script (Recommended)

#### Windows
```cmd
cd packages\icp-canister
deploy-local.bat
```

#### Unix/Linux/macOS
```bash
cd packages/icp-canister
chmod +x deploy-local.sh
./deploy-local.sh
```

### Method 2: Using Make
```bash
cd packages/icp-canister
make deploy-local
```

### Method 3: Manual Deployment

1. **Start DFX Local Replica**
   ```bash
   # From project root
   dfx start --clean
   ```

2. **Build the Canister**
   ```bash
   cd packages/icp-canister
   cargo build --target wasm32-unknown-unknown --release
   ```

3. **Deploy to Local Replica**
   ```bash
   # From project root
   dfx deploy dhaniverse_backend
   ```

4. **Generate Declarations**
   ```bash
   dfx generate dhaniverse_backend
   ```

### Verification

Test the deployed canister:

```bash
# Health check
dfx canister call dhaniverse_backend health_check

# Get available wallets
dfx canister call dhaniverse_backend get_available_wallets

# Check canister status
dfx canister status dhaniverse_backend
```

## IC Mainnet Deployment

### Prerequisites for Mainnet

1. **Cycles Wallet**
   - Get cycles from [NNS Dapp](https://nns.ic0.app/) or [Cycles Faucet](https://faucet.dfinity.org/)
   - Ensure you have sufficient cycles (minimum 1T cycles recommended)

2. **DFX Identity**
   ```bash
   # Create or use existing identity
   dfx identity new production
   dfx identity use production
   
   # Check current identity
   dfx identity whoami
   ```

### Method 1: Automated Script

```bash
cd packages/icp-canister
chmod +x deploy-ic.sh
./deploy-ic.sh
```

### Method 2: Using Make

```bash
cd packages/icp-canister
make deploy-ic
```

### Method 3: Manual Deployment

1. **Build for Production**
   ```bash
   cd packages/icp-canister
   cargo build --target wasm32-unknown-unknown --release
   ```

2. **Deploy to IC Mainnet**
   ```bash
   # From project root
   dfx deploy --network ic dhaniverse_backend
   ```

3. **Generate Declarations**
   ```bash
   dfx generate dhaniverse_backend --network ic
   ```

### Post-Deployment

1. **Get Canister Information**
   ```bash
   # Get canister ID
   dfx canister id dhaniverse_backend --network ic
   
   # Check status and cycles
   dfx canister status dhaniverse_backend --network ic
   ```

2. **Test Deployment**
   ```bash
   # Health check
   dfx canister call dhaniverse_backend health_check --network ic
   
   # Test basic functionality
   dfx canister call dhaniverse_backend get_available_wallets --network ic
   ```

3. **Access URLs**
   ```
   Candid UI: https://<canister-id>.ic0.app/
   Raw Access: https://<canister-id>.raw.ic0.app/
   ```

## Canister Upgrade

### Local Upgrade

```bash
cd packages/icp-canister
./upgrade-canister.sh --network local
```

### IC Mainnet Upgrade

```bash
cd packages/icp-canister
./upgrade-canister.sh --network ic --backup
```

### Manual Upgrade Process

1. **Build New Version**
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

2. **Stop Canister**
   ```bash
   dfx canister stop dhaniverse_backend --network ic
   ```

3. **Upgrade Canister**
   ```bash
   dfx canister install dhaniverse_backend --mode upgrade --network ic
   ```

4. **Start Canister**
   ```bash
   dfx canister start dhaniverse_backend --network ic
   ```

5. **Verify Upgrade**
   ```bash
   dfx canister call dhaniverse_backend health_check --network ic
   ```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clean and rebuild
cargo clean
cargo build --target wasm32-unknown-unknown --release

# Check Rust toolchain
rustup show
rustup target add wasm32-unknown-unknown
```

#### DFX Connection Issues

```bash
# Restart DFX
dfx stop
dfx start --clean

# Check DFX version
dfx --version

# Reset local state
rm -rf .dfx
dfx start --clean
```

#### Cycles Issues

```bash
# Check cycles balance
dfx canister status dhaniverse_backend --network ic

# Top up cycles
dfx canister deposit-cycles 1000000000000 dhaniverse_backend --network ic
```

#### Candid Interface Issues

```bash
# Regenerate Candid interface
cargo run --bin generate_candid > rust_icp_canister.did

# Validate Candid file
dfx candid check rust_icp_canister.did
```

### Debug Mode

Enable detailed logging:

```bash
# Set environment variable
export RUST_LOG=debug

# Deploy with debug info
dfx deploy dhaniverse_backend --verbose
```

### Network Issues

```bash
# Check network connectivity
ping ic0.app

# Use different DFX network
dfx ping --network ic

# Check replica status
dfx replica --version
```

## Post-Deployment Testing

### Automated Testing

```bash
# Run integration tests against deployed canister
cargo test --test integration_tests

# Run all tests
make test
```

### Manual Testing

#### Basic Functionality
```bash
# Health check
dfx canister call dhaniverse_backend health_check --network ic

# Get available wallets
dfx canister call dhaniverse_backend get_available_wallets --network ic
```

#### Wallet Operations
```bash
# Connect wallet
dfx canister call dhaniverse_backend connect_wallet '(variant { MetaMask }, "0x1234567890123456789012345678901234567890", "1")' --network ic

# Check wallet status
dfx canister call dhaniverse_backend get_wallet_status '("0x1234567890123456789012345678901234567890")' --network ic
```

#### Banking Operations
```bash
# Create session first
dfx canister call dhaniverse_backend create_session '(record { address = "0x1234567890123456789012345678901234567890"; chain_id = "1"; wallet_type = variant { MetaMask }; balance = opt "1.5 ETH" })' --network ic

# Get balance
dfx canister call dhaniverse_backend get_dual_balance '("0x1234567890123456789012345678901234567890")' --network ic

# Exchange currency
dfx canister call dhaniverse_backend exchange_currency '("0x1234567890123456789012345678901234567890", "rupees", "tokens", 1000.0)' --network ic
```

### Performance Testing

```bash
# Monitor canister performance
dfx canister logs dhaniverse_backend --network ic

# Check memory usage
dfx canister status dhaniverse_backend --network ic
```

## Monitoring and Maintenance

### Regular Checks

1. **Cycles Balance**
   ```bash
   dfx canister status dhaniverse_backend --network ic
   ```

2. **Canister Logs**
   ```bash
   dfx canister logs dhaniverse_backend --network ic
   ```

3. **Health Status**
   ```bash
   dfx canister call dhaniverse_backend health_check --network ic
   ```

### Backup and Recovery

1. **State Backup** (before upgrades)
   ```bash
   ./upgrade-canister.sh --network ic --backup
   ```

2. **Configuration Backup**
   ```bash
   # Backup dfx.json and Candid files
   cp dfx.json dfx.json.backup
   cp packages/icp-canister/rust_icp_canister.did rust_icp_canister.did.backup
   ```

### Scaling Considerations

- Monitor cycles consumption
- Plan for increased storage needs
- Consider canister splitting for large datasets
- Implement proper error handling and recovery

## Security Checklist

- [ ] Use production identity for mainnet deployment
- [ ] Verify Candid interface matches implementation
- [ ] Test all critical functions post-deployment
- [ ] Monitor cycles balance regularly
- [ ] Keep backup of canister state before upgrades
- [ ] Validate all user inputs
- [ ] Implement proper access controls
- [ ] Regular security audits

## Support and Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs/)
- [DFX Command Reference](https://internetcomputer.org/docs/current/references/cli-reference/)
- [Candid Guide](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)
- [Cycles Management](https://internetcomputer.org/docs/current/developer-docs/setup/cycles/)

---

For additional support, please refer to the main README.md or create an issue in the repository.