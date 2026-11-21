# ==============================================================================
# OpenPDF Studio - Android Production Build Automation Script (PowerShell)
# ==============================================================================
param (
    [switch]$SkipTests = $false,
    [switch]$BuildBundle = $true
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   OpenPDF Studio - Native Android Release Build Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Flutter CLI
try {
    $flutterVersion = flutter --version
    Write-Host "[✓] Flutter SDK detected" -ForegroundColor Green
} catch {
    Write-Host "[✕] Flutter CLI is not in your PATH. Please install Flutter SDK." -ForegroundColor Red
    exit 1
}

# 2. Navigate to root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# 3. Fetch Packages
Write-Host "`n--> Fetching Flutter dependencies..." -ForegroundColor Yellow
flutter pub get

# 4. Run Static Analyzer
Write-Host "`n--> Running static code analysis..." -ForegroundColor Yellow
flutter analyze --no-fatal-infos

# 5. Run Unit & Widget Tests
if (-not $SkipTests) {
    Write-Host "`n--> Running test suites..." -ForegroundColor Yellow
    flutter test
}

# 6. Build Universal Release APK
Write-Host "`n--> Building Universal Release APK..." -ForegroundColor Yellow
flutter build apk --release

# 7. Build Google Play App Bundle (AAB)
if ($BuildBundle) {
    Write-Host "`n--> Building Google Play App Bundle (AAB)..." -ForegroundColor Yellow
    flutter build appbundle --release
}

# 8. Report Artifact Locations
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   Release Artifacts Generated Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

$apkPath = Join-Path $ProjectRoot "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "• Release APK:    $apkPath ({0:N2} MB)" -f $apkSize -ForegroundColor White
}

if ($BuildBundle) {
    $aabPath = Join-Path $ProjectRoot "build\app\outputs\bundle\release\app-release.aab"
    if (Test-Path $aabPath) {
        $aabSize = (Get-Item $aabPath).Length / 1MB
        Write-Host "• Play Store AAB: $aabPath ({0:N2} MB)" -f $aabSize -ForegroundColor White
    }
}
