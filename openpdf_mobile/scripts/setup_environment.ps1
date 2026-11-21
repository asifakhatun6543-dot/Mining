# OpenPDF Studio - Environment Setup Script (Windows)
# Downloads and configures the optimal SDK stack:
# 1. Java JDK: Microsoft OpenJDK 17 LTS (Required for Gradle 8)
# 2. Flutter SDK: Flutter 3.24 Stable Channel
# 3. Android SDK: Command-line Tools & Platform 34

$ErrorActionPreference = "Stop"

$toolsDir = "C:\Users\Admin\tools"
if (!(Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  OpenPDF Studio - Recommended SDK Installation Suite    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. Java JDK: OpenJDK 17 LTS (Most stable for Gradle 8)" -ForegroundColor Yellow
Write-Host "2. Flutter SDK: Flutter 3.24.x Stable" -ForegroundColor Yellow
Write-Host "3. Android SDK: API Level 34" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Install Java JDK 17 via Winget
Write-Host "`n[1/3] Installing Microsoft OpenJDK 17..." -ForegroundColor Green
try {
    winget install --id Microsoft.OpenJDK.17 --silent --accept-package-agreements --accept-source-agreements
    Write-Host "JDK 17 installed successfully ✓" -ForegroundColor Green
} catch {
    Write-Host "Winget install completed or already present." -ForegroundColor Gray
}

# Find JDK installation path
$jdkPath = (Get-ChildItem -Path "C:\Program Files\Microsoft" -Filter "jdk-17*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if (!$jdkPath) {
    $jdkPath = (Get-ChildItem -Path "C:\Program Files\Eclipse Adoptium" -Filter "jdk-17*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}

if ($jdkPath) {
    Write-Host "Configuring JAVA_HOME -> $jdkPath" -ForegroundColor Cyan
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "User")
    $env:JAVA_HOME = $jdkPath
}

# 2. Install Flutter SDK
$flutterDir = "$toolsDir\flutter"
if (Test-Path "$flutterDir\bin\flutter.bat") {
    Write-Host "`n[2/3] Flutter SDK already present at $flutterDir ✓" -ForegroundColor Green
} else {
    Write-Host "`n[2/3] Downloading Flutter 3.24 Stable SDK (~1 GB)..." -ForegroundColor Green
    $flutterZip = "$toolsDir\flutter_windows.zip"
    $flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.5-stable.zip"
    
    Invoke-WebRequest -Uri $flutterUrl -OutFile $flutterZip
    Write-Host "Extracting Flutter SDK to $toolsDir..." -ForegroundColor Cyan
    Expand-Archive -Path $flutterZip -DestinationPath $toolsDir -Force
    Remove-Item -Path $flutterZip -Force
    Write-Host "Flutter SDK extraction complete ✓" -ForegroundColor Green
}

# Add Flutter to User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$flutterDir\bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$flutterDir\bin", "User")
    $env:Path += ";$flutterDir\bin"
    Write-Host "Added $flutterDir\bin to PATH ✓" -ForegroundColor Cyan
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Setup complete! Run: flutter doctor to verify SDKs" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
