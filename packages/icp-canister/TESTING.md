# Testing Guide

This guide covers all aspects of testing the Dhaniverse Rust ICP Canister, including unit tests, integration tests, and manual testing procedures.

## Table of Contents

- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Manual Testing](#manual-testing)
- [Performance Testing](#performance-testing)
- [Test Data](#test-data)
- [Continuous Integration](#continuous-integration)

## Test Structure

The testing suite is organized into several layers:

```
packages/icp-canister/
├── src/
│   ├── tests.rs              # Unit tests
│   └── lib.rs                # Main library with test modules
├── tests/
│   └── integration_tests.rs  # PocketIC integration tests
└── benches/                  # Performance benchmarks (optional)
```

## Unit Testing

### Running Unit Tests

```bash
# Run all unit tests
cargo test

# Run specific test module
cargo test --lib tests::test_currency_exchange_calculations

# Run with output
cargo test -- --nocapture

# Run tests with specific pattern
cargo test exchange

# Using Make
make test-unit
```

### Test Categories

#### 1. Data Type Serialization Tests

```rust
#[test]
fn test_wallet_type_serialization() {
    let wallet_type = WalletType::MetaMask;
    let serialized = serde_json::to_string(&wallet_type).unwrap();
    let deserialized: WalletType = serde_json::from_str(&serialized).unwrap();
    assert_eq!(wallet_type, deserialized);
}
```

#### 2. Currency Exchange Tests

```rust
#[test]
fn test_currency_exchange_calculations() {
    // Test rupees to tokens (rate = 0.1)
    let result = utils::calculate_exchange(1000.0, 0.1).unwrap();
    assert_eq!(result, 100.0);
}
```

#### 3. Staking Calculations Tests

```rust
#[test]
fn test_staking_apy_calculations() {
    let rewards = utils::calculate_staking_rewards(1000.0, 10.0, 0, one_year_later).unwrap();
    assert!((rewards - 100.0).abs() < 1.0);
}
```

#### 4. Validation Tests

```rust
#[test]
fn test_ethereum_address_validation() {
    assert!(utils::validate_ethereum_address("0x1234567890123456789012345678901234567890").is_ok());
    assert!(utils::validate_ethereum_address("invalid").is_err());
}
```

#### 5. Error Handling Tests

```rust
#[test]
fn test_error_display() {
    let error = CanisterError::InsufficientBalance;
    assert_eq!(error.to_string(), "Insufficient balance for this operation");
}
```

### Writing New Unit Tests

1. **Add test to appropriate module**:
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_new_functionality() {
           // Test implementation
       }
   }
   ```

2. **Follow naming conventions**:
   - `test_` prefix for all test functions
   - Descriptive names: `test_currency_exchange_with_invalid_amount`

3. **Use proper assertions**:
   ```rust
   assert_eq!(actual, expected);
   assert!(condition);
   assert!(result.is_ok());
   assert!(result.is_err());
   ```

## Integration Testing

### PocketIC Setup

Integration tests use PocketIC to test the complete canister in a simulated IC environment.

### Running Integration Tests

```bash
# Build canister first
cargo build --target wasm32-unknown-unknown --release

# Run integration tests
cargo test --test integration_tests

# Using Make
make test-integration
```

### Test Scenarios

#### 1. Canister Installation Test

```rust
#[test]
fn test_canister_installation() {
    let (pic, canister_id) = setup_canister();
    
    let result = pic.query_call(
        canister_id,
        Principal::anonymous(),
        "health_check",
        Encode!().unwrap(),
    );
    
    assert!(result.is_ok());
}
```

#### 2. Wallet Connection Flow Test

```rust
#[test]
fn test_wallet_connection_flow() {
    let (pic, canister_id) = setup_canister();
    
    // Test wallet connection
    let result = pic.update_call(
        canister_id,
        Principal::anonymous(),
        "connect_wallet",
        Encode!(&wallet_type, &address, &chain_id).unwrap(),
    );
    
    assert!(result.is_ok());
}
```

#### 3. Banking Operations Test

```rust
#[test]
fn test_banking_operations() {
    // Setup wallet and session
    // Test currency exchange
    // Verify balance changes
}
```

#### 4. Concurrent Operations Test

```rust
#[test]
fn test_concurrent_operations() {
    // Setup multiple users
    // Perform concurrent operations
    // Verify state consistency
}
```

### Integration Test Best Practices

1. **Always setup canister properly**:
   ```rust
   fn setup_canister() -> (PocketIc, Principal) {
       let pic = PocketIc::new();
       let canister_id = pic.create_canister();
       pic.add_cycles(canister_id, 2_000_000_000_000);
       // Install canister...
   }
   ```

2. **Test complete workflows**:
   - Connect wallet → Create session → Perform operations
   - Test error conditions and edge cases

3. **Verify state changes**:
   - Check balances before and after operations
   - Verify transaction history
   - Confirm achievement unlocks

## Manual Testing

### Local Testing Commands

#### Health Check
```bash
dfx canister call dhaniverse_backend health_check
```

#### Wallet Operations
```bash
# Get available wallets
dfx canister call dhaniverse_backend get_available_wallets

# Connect wallet
dfx canister call dhaniverse_backend connect_wallet '(variant { MetaMask }, "0x1234567890123456789012345678901234567890", "1")'

# Get wallet status
dfx canister call dhaniverse_backend get_wallet_status '("0x1234567890123456789012345678901234567890")'
```

#### Session Management
```bash
# Create session
dfx canister call dhaniverse_backend create_session '(record { address = "0x1234567890123456789012345678901234567890"; chain_id = "1"; wallet_type = variant { MetaMask }; balance = opt "1.5 ETH" })'

# Get session
dfx canister call dhaniverse_backend get_session '("0x1234567890123456789012345678901234567890")'

# Clear session
dfx canister call dhaniverse_backend clear_session '("0x1234567890123456789012345678901234567890")'
```

#### Banking Operations
```bash
# Get balance
dfx canister call dhaniverse_backend get_dual_balance '("0x1234567890123456789012345678901234567890")'

# Exchange currency
dfx canister call dhaniverse_backend exchange_currency '("0x1234567890123456789012345678901234567890", "rupees", "tokens", 1000.0)'

# Stake tokens
dfx canister call dhaniverse_backend stake_tokens '("0x1234567890123456789012345678901234567890", 500.0, 30)'

# Get staking info
dfx canister call dhaniverse_backend get_staking_info '("0x1234567890123456789012345678901234567890")'
```

#### Achievement System
```bash
# Get achievements
dfx canister call dhaniverse_backend get_achievements '("0x1234567890123456789012345678901234567890")'

# Claim achievement reward
dfx canister call dhaniverse_backend claim_achievement_reward '("0x1234567890123456789012345678901234567890", "first_exchange")'
```

#### DeFi Simulations
```bash
# Simulate liquidity pool
dfx canister call dhaniverse_backend simulate_liquidity_pool '("0x1234567890123456789012345678901234567890", 1000.0)'

# Simulate yield farming
dfx canister call dhaniverse_backend simulate_yield_farming '("0x1234567890123456789012345678901234567890", 500.0)'
```

#### Transaction History
```bash
# Get transaction history
dfx canister call dhaniverse_backend get_transaction_history '("0x1234567890123456789012345678901234567890")'

# Create transaction
dfx canister call dhaniverse_backend create_transaction '("0x1234567890123456789012345678901234567890", variant { Deposit }, 100.0, null)'
```

### Test Scenarios

#### Complete User Journey
1. Connect wallet
2. Create session
3. Check initial balance (25,000 rupees, 0 tokens)
4. Exchange 5,000 rupees to 500 tokens
5. Stake 200 tokens for 30 days
6. Check achievements (should have first exchange and first stake)
7. Claim achievement rewards
8. Simulate DeFi operations
9. Check transaction history
10. Disconnect wallet

#### Error Testing
```bash
# Test without session
dfx canister call dhaniverse_backend get_dual_balance '("0x1234567890123456789012345678901234567890")'

# Test invalid address
dfx canister call dhaniverse_backend connect_wallet '(variant { MetaMask }, "invalid_address", "1")'

# Test insufficient balance
dfx canister call dhaniverse_backend exchange_currency '("0x1234567890123456789012345678901234567890", "tokens", "rupees", 999999.0)'
```

## Performance Testing

### Benchmarking

```bash
# Run benchmarks (if implemented)
cargo bench

# Profile memory usage
cargo build --target wasm32-unknown-unknown --release
wasm-opt --print-stack-ir target/wasm32-unknown-unknown/release/rust_icp_canister.wasm
```

### Load Testing

```bash
# Test with multiple concurrent users
for i in {1..10}; do
    dfx canister call dhaniverse_backend connect_wallet "(variant { MetaMask }, \"0x$(printf '%040d' $i)\", \"1\")" &
done
wait
```

### Memory and Cycles Testing

```bash
# Check canister status
dfx canister status dhaniverse_backend

# Monitor cycles consumption
dfx canister call dhaniverse_backend health_check
dfx canister status dhaniverse_backend
```

## Test Data

### Sample Wallet Addresses

```
Ethereum:
- 0x1234567890123456789012345678901234567890
- 0xabcdefABCDEF1234567890123456789012345678
- 0x742d35Cc6634C0532925a3b8D404d3aAB8b9c2d

Solana:
- 11111111111111111111111111111112
- So11111111111111111111111111111111111111112
```

### Test User Data

```rust
let test_user = UserData {
    wallet_address: "0x1234567890123456789012345678901234567890".to_string(),
    dual_balance: DualBalance {
        rupees_balance: 25000.0,
        token_balance: 0.0,
        last_updated: ic_cdk::api::time(),
    },
    // ... other fields
};
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      - name: Run tests
        run: |
          cd packages/icp-canister
          cargo test
          cargo build --target wasm32-unknown-unknown --release
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
cd packages/icp-canister
make check-all
EOF

chmod +x .git/hooks/pre-commit
```

## Test Coverage

### Generating Coverage Reports

```bash
# Install cargo-tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage

# View coverage
open coverage/tarpaulin-report.html
```

### Coverage Goals

- Unit tests: >90% code coverage
- Integration tests: Cover all public API methods
- Manual tests: Cover complete user workflows

## Debugging Tests

### Debug Output

```bash
# Run tests with debug output
RUST_LOG=debug cargo test -- --nocapture

# Run specific test with debug
cargo test test_currency_exchange -- --nocapture
```

### Test Debugging Tips

1. Use `println!` for debugging test failures
2. Use `dbg!` macro for variable inspection
3. Run tests individually to isolate issues
4. Check test setup and teardown

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Assertions**: Use descriptive assertion messages
3. **Edge Cases**: Test boundary conditions and error cases
4. **Documentation**: Document complex test scenarios
5. **Maintenance**: Keep tests updated with code changes

---

For more information on testing Rust code, see the [Rust Book Testing Chapter](https://doc.rust-lang.org/book/ch11-00-testing.html).