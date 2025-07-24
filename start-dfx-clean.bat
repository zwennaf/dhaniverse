@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    DFX Clean Startup Script
echo ========================================

echo [1/8] Stopping any running DFX processes...
dfx stop 2>nul

echo [2/8] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :4943') do (
    echo Killing process on port 4943: %%a
    taskkill /f /pid %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :35245') do (
    echo Killing PocketIC process on port 35245: %%a
    taskkill /f /pid %%a 2>nul
)

echo [3/8] Cleaning DFX cache and state...
if exist .dfx (
    echo Removing .dfx directory...
    rmdir /s /q .dfx
)

if exist packages\icp-canister\.dfx (
    echo Removing canister .dfx directory...
    rmdir /s /q packages\icp-canister\.dfx
)

echo [4/8] Cleaning Azle cache...
if exist packages\icp-canister\.azle (
    echo Removing .azle directory...
    rmdir /s /q packages\icp-canister\.azle
)

echo [5/8] Installing dependencies...
cd packages\icp-canister
npm install
cd ..\..

echo [6/8] Starting DFX with clean state...
start /b dfx start --clean

echo [7/8] Waiting for DFX to initialize...
timeout /t 15 /nobreak >nul

echo [8/8] Checking DFX status...
dfx ping local
if !errorlevel! neq 0 (
    echo ERROR: DFX failed to start properly
    echo Try running this script again or check the DFX logs
    pause
    exit /b 1
)

echo ========================================
echo    DFX started successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run: dfx deploy
echo 2. Or run: npm run deploy
echo.
pause