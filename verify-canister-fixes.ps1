#!/usr/bin/env pwsh
# Canister Fix Verification Script
# Run this to verify all fixes are in place

Write-Host "`n🔍 Verifying Canister Integration Fixes..." -ForegroundColor Cyan
Write-Host "=" * 60

# Check 1: Network Config
Write-Host "`n✓ Checking Network Configuration..." -ForegroundColor Yellow
$networkConfig = Get-Content "src\config\network.ts" -Raw
if ($networkConfig -match "return 'ic';.*ALWAYS use IC mainnet") {
    Write-Host "  ✅ Network config forces IC mainnet" -ForegroundColor Green
} else {
    Write-Host "  ❌ Network config not updated" -ForegroundColor Red
}

# Check 2: Canister Service Method
Write-Host "`n✓ Checking Canister Service..." -ForegroundColor Yellow
$canisterService = Get-Content "src\services\canisterService.ts" -Raw
if ($canisterService -match "get_market_summary") {
    Write-Host "  ✅ Using correct canister method (get_market_summary)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Still using incorrect method" -ForegroundColor Red
}

if ($canisterService -match "Auto-initialize on import") {
    Write-Host "  ✅ Auto-initialization enabled" -ForegroundColor Green
} else {
    Write-Host "  ❌ Auto-initialization missing" -ForegroundColor Red
}

if ($canisterService -notmatch "fetchRootKey\(\)") {
    Write-Host "  ✅ Root key fetching removed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Root key fetching still present" -ForegroundColor Yellow
}

# Check 3: Stock Price Service
Write-Host "`n✓ Checking Stock Price Service..." -ForegroundColor Yellow
$stockPriceService = Get-Content "src\services\stockPriceService.ts" -Raw
if ($stockPriceService -match "Initializing canister connection") {
    Write-Host "  ✅ Initialization check added" -ForegroundColor Green
} else {
    Write-Host "  ❌ Initialization check missing" -ForegroundColor Red
}

# Check 4: Stock Market Manager
Write-Host "`n✓ Checking Stock Market Manager..." -ForegroundColor Yellow
$stockMarketManager = Get-Content "src\game\systems\StockMarketManager.ts" -Raw
if ($stockMarketManager -match "Using fallback stock prices \(canister unavailable\)") {
    Write-Host "  ✅ Improved error handling in place" -ForegroundColor Green
} else {
    Write-Host "  ❌ Error handling not updated" -ForegroundColor Red
}

# Check 5: Test Page
Write-Host "`n✓ Checking Test Resources..." -ForegroundColor Yellow
if (Test-Path "test-canister-connection.html") {
    Write-Host "  ✅ Test page created" -ForegroundColor Green
} else {
    Write-Host "  ❌ Test page missing" -ForegroundColor Red
}

if (Test-Path "CANISTER_FIX_SUMMARY.md") {
    Write-Host "  ✅ Fix documentation created" -ForegroundColor Green
} else {
    Write-Host "  ❌ Fix documentation missing" -ForegroundColor Red
}

# Summary
Write-Host "`n" + ("=" * 60)
Write-Host "📊 Verification Complete!" -ForegroundColor Cyan
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run dev' to start the development server"
Write-Host "  2. Navigate to http://localhost:5173/test-canister-connection.html"
Write-Host "  3. Click test buttons to verify canister connectivity"
Write-Host "  4. Check browser console for detailed logs"
Write-Host "  5. Test stock market in the game"
Write-Host "`n📚 See CANISTER_FIX_SUMMARY.md for complete details`n"
