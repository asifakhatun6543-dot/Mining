#!/usr/bin/env bash
# ==============================================================================
# OpenPDF Studio - Android Production Build Automation Script (Bash)
# ==============================================================================
set -e

echo "=========================================================="
echo "   OpenPDF Studio - Native Android Release Build Pipeline"
echo "=========================================================="

if ! command -v flutter &> /dev/null; then
    echo "Error: Flutter CLI not found in PATH."
    exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "--> Fetching dependencies..."
flutter pub get

echo "--> Running static code analysis..."
flutter analyze --no-fatal-infos

echo "--> Running tests..."
flutter test

echo "--> Building Universal Release APK..."
flutter build apk --release

echo "--> Building Google Play Store App Bundle (AAB)..."
flutter build appbundle --release

echo "=========================================================="
echo "   Release Artifacts Generated Successfully!"
echo "=========================================================="
echo "• Release APK: build/app/outputs/flutter-apk/app-release.apk"
echo "• Release AAB: build/app/outputs/bundle/release/app-release.aab"
