@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Canister Deployment Script
echo ========================================

echo [1/5] Checking DFX status...
dfx ping local
if !errorlevel! neq 0 (
    echo ERROR: DFX is not running. Please run start-dfx-clean.bat first
    pause
    exit /b 1
)

echo [2/5] Building canister...
cd packages\icp-canister
npm run build
if !errorlevel! neq 0 (
    echo ERROR: Failed to build canister
    cd ..\..
    pause
    exit /b 1
)
cd ..\..

echo [3/5] Deploying Internet Identity...
dfx deploy internet_identity
if !errorlevel! neq 0 (
    echo WARNING: Internet Identity deployment failed, continuing...
)

echo [4/5] Deploying Dhaniverse canister...
dfx deploy dhaniverse
if !errorlevel! neq 0 (
    echo ERROR: Failed to deploy dhaniverse canister
    pause
    exit /b 1
)

echo [5/5] Updating environment variables...
call configure-canisters.sh

echo ========================================
echo    Deployment completed successfully!
echo ========================================
echo.
echo Canister URLs:
dfx canister call dhaniverse getHealth
echo.
pause