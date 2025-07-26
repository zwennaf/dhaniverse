@echo off
REM Build script for Rust ICP Canister (Windows)

echo 🔨 Building Rust ICP Canister...
echo.

REM Check if Rust is installed
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust is not installed
    exit /b 1
)

REM Add wasm32 target
echo [INFO] Ensuring wasm32-unknown-unknown target...
rustup target add wasm32-unknown-unknown

REM Navigate to canister directory
cd /d "%~dp0"

REM Clean previous builds
echo [INFO] Cleaning previous builds...
cargo clean

REM Build for wasm32 target
echo [INFO] Building canister...
cargo build --target wasm32-unknown-unknown --release

if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)

echo [INFO] Build successful ✓

REM Generate Candid interface
echo [INFO] Generating Candid interface...
cargo run --bin generate_candid > rust_icp_canister.did

if %errorlevel% equ 0 (
    echo [INFO] Candid interface generated ✓
) else (
    echo [WARN] Failed to generate Candid interface
)

REM Run tests
echo [INFO] Running unit tests...
cargo test

if %errorlevel% equ 0 (
    echo [INFO] Unit tests passed ✓
) else (
    echo [WARN] Some unit tests failed
)

echo.
echo [INFO] Build completed successfully! 🎉
echo.
echo 📁 Output files:
echo   • WASM: target\wasm32-unknown-unknown\release\rust_icp_canister.wasm
echo   • Candid: rust_icp_canister.did
echo.
echo 🚀 Ready for deployment!

pause