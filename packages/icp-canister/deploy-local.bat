@echo off
REM Dhaniverse Rust ICP Canister - Local Deployment Script for Windows

echo 🚀 Starting Dhaniverse Rust ICP Canister deployment...
echo.

REM Check if Rust is installed
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust is not installed. Please install Rust first.
    exit /b 1
)

REM Check if DFX is installed
where dfx >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] DFX is not installed. Please install DFX first.
    exit /b 1
)

echo [INFO] Prerequisites check completed ✓

REM Add wasm32 target if not present
echo [INFO] Ensuring wasm32-unknown-unknown target is installed...
rustup target add wasm32-unknown-unknown

REM Navigate to canister directory
cd /d "%~dp0"

REM Clean and build
echo [INFO] Building Rust canister...
cargo clean
cargo build --target wasm32-unknown-unknown --release

if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Rust canister
    exit /b 1
)

echo [INFO] Rust canister built successfully ✓

REM Navigate to project root
cd ..\..

REM Check if DFX is running
dfx ping >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Starting DFX local replica...
    start /b dfx start --clean
    
    REM Wait for DFX to start
    echo [INFO] Waiting for DFX to be ready...
    timeout /t 10 /nobreak >nul
    
    REM Verify DFX is running
    dfx ping >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to start DFX
        exit /b 1
    )
) else (
    echo [INFO] DFX is already running ✓
)

REM Deploy the canister
echo [INFO] Deploying canister to local replica...
dfx deploy dhaniverse_backend

if %errorlevel% neq 0 (
    echo [ERROR] Failed to deploy canister
    exit /b 1
)

echo [INFO] Canister deployed successfully ✓

REM Generate declarations
echo [INFO] Generating declarations...
dfx generate dhaniverse_backend

REM Test the canister
echo [INFO] Testing deployed canister...
echo [INFO] Testing health check...
dfx canister call dhaniverse_backend health_check

echo [INFO] Testing get available wallets...
dfx canister call dhaniverse_backend get_available_wallets

echo.
echo 📋 Deployment Information:
echo   • Canister Name: dhaniverse_backend
echo   • Network: local
echo   • Candid Interface: packages/icp-canister/rust_icp_canister.did
echo.
echo 🔧 Useful Commands:
echo   • Test health: dfx canister call dhaniverse_backend health_check
echo   • Get wallets: dfx canister call dhaniverse_backend get_available_wallets
echo   • View logs: dfx canister logs dhaniverse_backend
echo   • Check status: dfx canister status dhaniverse_backend
echo.
echo 📚 Documentation: packages/icp-canister/README.md
echo.
echo [INFO] Deployment completed successfully! 🎉
echo [INFO] Happy coding! 🚀

pause