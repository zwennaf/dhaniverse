# Dhaniverse ICP Canister Setup Guide

## 🚀 Quick Start for Developers

### Prerequisites
- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (v0.15.0+)
- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)

### Installation Commands
```bash
# Install DFX
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Verify installations
dfx --version
cargo --version
node --version
```

## 🏗️ Project Structure
```
client/packages/icp-canister/
├── src/                    # Rust source code
├── dfx.json               # DFX configuration
├── Cargo.toml             # Rust dependencies
├── canister_ids.json      # Canister IDs for networks
├── scripts/               # Deployment scripts
└── README.md              # This file
```

## 🔧 Development Workflow

### 1. Local Development
```bash
# Navigate to canister directory
cd client/packages/icp-canister

# Start local replica
dfx start --clean --background

# Deploy locally
dfx deploy --network local

# Test functions
dfx canister call dhaniverse_backend health_check
```

### 2. Mainnet Deployment
```bash
# Build for production
dfx build --network ic

# Deploy to mainnet
dfx deploy --network ic

# Verify deployment
dfx canister --network ic status dhaniverse_backend
```

## 🌐 Network Configuration

### Mainnet Canister IDs
- **Backend**: `dzbzg-eqaaa-aaaap-an3rq-cai`
- **Frontend**: TBD (will be assigned on first frontend deploy)

### URLs
- **Backend API**: https://dzbzg-eqaaa-aaaap-an3rq-cai.icp0.io/
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=dzbzg-eqaaa-aaaap-an3rq-cai

## 👥 Team Setup

### For New Team Members
1. **Clone the repository**
2. **Install prerequisites** (see above)
3. **Run setup script**: `./scripts/setup.sh`
4. **Create DFX identity**: `dfx identity new [your-name]`
5. **Switch to your identity**: `dfx identity use [your-name]`

### Identity Management
```bash
# List identities
dfx identity list

# Create new identity
dfx identity new developer-name

# Switch identity
dfx identity use developer-name

# Get your principal
dfx identity get-principal
```

## 🔐 Permissions & Controllers

### Current Controller
- **Principal**: `36q22-eox2s-m6uxb-5jaib-gclok-vqa4e-ougby-bzglh-ky7i7-iaq2r-jqe`
- **Identity**: `gursimran`

### Adding New Controllers
```bash
# Add team member as controller
dfx canister --network ic update-settings --add-controller [PRINCIPAL_ID] dhaniverse_backend

# Remove controller (admin only)
dfx canister --network ic update-settings --remove-controller [PRINCIPAL_ID] dhaniverse_backend
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
cargo test

# Integration tests
cargo test --test integration_tests

# Canister tests
dfx canister call dhaniverse_backend health_check
```

### Available Test Functions
- `health_check()` - Basic connectivity test
- `get_canister_metrics()` - Performance metrics
- `get_system_health()` - System status

## 📦 Build & Deploy Scripts

### Quick Commands
```bash
# Local development
npm run dev:local

# Build for production
npm run build:ic

# Deploy to mainnet
npm run deploy:ic

# Full rebuild and deploy
npm run redeploy:ic
```

## 🔄 CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/deploy.yml
name: Deploy to IC
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install DFX
        run: sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
      - name: Deploy
        run: |
          cd client/packages/icp-canister
          dfx deploy --network ic
```

## 🚨 Troubleshooting

### Common Issues
1. **"Canister not found"** - Check canister_ids.json matches network
2. **"Permission denied"** - Ensure you're added as controller
3. **"Build failed"** - Check Rust toolchain and dependencies
4. **"Network timeout"** - Try `dfx ping ic` to test connectivity

### Debug Commands
```bash
# Check canister status
dfx canister --network ic status dhaniverse_backend

# View canister info
dfx canister --network ic info dhaniverse_backend

# Check cycles balance
dfx wallet --network ic balance
```

## 💰 Cycles Management

### Monitoring
```bash
# Check canister cycles
dfx canister --network ic status dhaniverse_backend

# Top up cycles (if needed)
dfx canister --network ic deposit-cycles 1000000000000 dhaniverse_backend
```

### Cycle Alerts
- Monitor cycles regularly
- Set up alerts when < 1T cycles
- Budget ~100B cycles per month for active development

## 📚 Additional Resources
- [Internet Computer Documentation](https://internetcomputer.org/docs/)
- [DFX Command Reference](https://internetcomputer.org/docs/current/references/cli-reference/)
- [Rust CDK Documentation](https://docs.rs/ic-cdk/)
- [Candid Guide](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)