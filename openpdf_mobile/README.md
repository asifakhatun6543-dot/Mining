# OpenPDF Studio — Premium Native Android Application

**Framework:** Flutter (Dart)  
**Platform:** Android (API 24 to 34+)  
**Design:** iOS-inspired Liquid Glass + Android Material 3  
**Architecture:** Clean Architecture + Feature-First Modular Structure  

---

## 🌟 Overview

OpenPDF Studio for Android is a separate, dedicated native mobile application built from the ground up using Flutter and Dart. It completely preserves the functionality of the [mining-lilac.vercel.app](https://mining-lilac.vercel.app/) web suite while providing a mobile-first, Liquid Glass design experience optimized for touch gestures, AMOLED screens, and offline privacy.

### Key Highlights
- **100% Native Mobile Architecture:** Zero WebViews. Completely separate Flutter application with native Android lifecycle and storage integration.
- **Liquid Glass Visual Language:** Floating translucent navigation bars, specular border highlights, selective backdrop blur (`ImageFilter.blur`), and organic spring tab transitions.
- **23 Specialized Document Tools:** Complete catalog covering PDF editing, custom target compression, genuine OpenXML conversions, security, scanning, and AI document intelligence.
- **Privacy-First Local Processing:** Local PDF and office operations execute directly in device memory without cloud transmission.

---

## 📱 Navigation Architecture

The application is anchored by a persistent, floating Liquid Glass Bottom Navigation Bar featuring 4 primary tabs:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ 🏠 Home ]      [ ▦ All Tools ]      [ ✦ Chat AI ]     [ 🕒 History ] │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Home Tab:** Executive dashboard with dynamic time-based greeting, smart search, 4 quick actions, AI Assistant card, popular tools grid, and recent documents.
2. **All Tools Tab:** Full searchable catalog of all 23 tools categorized across *All Tools*, *AI & Smart*, *Convert from PDF*, *Convert to PDF*, *Optimize & Scan*, *Edit & Sign*, *Organize*, and *Security*.
3. **Chat AI Tab:** Document-aware conversational assistant with instant 3-bullet summaries, date/number detection, Hindi translation, action items, and context-backed Q&A.
4. **History Tab:** Relational persistent document history with file type badges, sizes, relative timestamps, sharing, and deletion.

---

## 📂 Project Architecture

```text
openpdf_mobile/
├── android/                         # Android native configurations & manifests
│   ├── app/
│   │   ├── build.gradle             # compileSdkVersion 34, minSdkVersion 24
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Scoped storage & PDF intent filters
│   │       └── kotlin/com/openpdf/studio/MainActivity.kt
│   ├── build.gradle
│   └── settings.gradle
│
├── lib/
│   ├── main.dart                    # Application entry point & edge-to-edge UI
│   ├── app/
│   │   └── app.dart                 # Root MaterialApp with theme bindings
│   ├── config/
│   │   └── theme/
│   │       ├── app_theme.dart       # Dark & Light ThemeData
│   │       └── glass_theme.dart     # Liquid Glass decorations, blurs & specular highlights
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_colors.dart      # Dark (#080D18) & Light palettes
│   │   │   └── app_strings.dart     # Strings and localized labels
│   │   └── services/
│   │       ├── file_service.dart    # Android SAF document picker & cache manager
│   │       ├── history_service.dart # Persistent SharedPreferences history
│   │       ├── pdf_processing_service.dart # Merge, split, rotate, compress, redact
│   │       ├── office_conversion_service.dart # Genuine OpenXML (.docx, .xlsx, .pptx)
│   │       ├── image_processing_service.dart # JPG/PNG to PDF & photocopy scanner simulation
│   │       └── document_ai_service.dart # Offline document intelligence & NLP
│   ├── data/
│   │   └── datasources/
│   │       └── tools_data.dart      # Complete 23-tools inventory
│   ├── domain/
│   │   └── entities/
│   │       ├── document_entity.dart
│   │       ├── tool_entity.dart
│   │       ├── history_entity.dart
│   │       └── chat_message_entity.dart
│   ├── features/
│   │   ├── shell/screens/main_shell_screen.dart # Persistent 4-tab shell
│   │   ├── home/screens/home_screen.dart        # Dashboard screen
│   │   ├── all_tools/screens/all_tools_screen.dart # 23 tools directory
│   │   ├── chat_ai/screens/chat_ai_screen.dart  # Document AI assistant screen
│   │   ├── history/screens/history_screen.dart  # Activity history screen
│   │   ├── settings/screens/settings_screen.dart # Settings & privacy screen
│   │   └── tools/screens/tool_workspace_screen.dart # Universal dedicated tool workspace
│   └── shared/
│       └── widgets/glass/
│           ├── glass_container.dart
│           ├── glass_card.dart
│           ├── glass_button.dart
│           ├── glass_bottom_nav.dart
│           ├── glass_search_bar.dart
│           ├── glass_tool_card.dart
│           └── glass_file_card.dart
│
├── test/
│   └── unit/
│       ├── tools_inventory_test.dart
│       ├── document_ai_service_test.dart
│       └── history_service_test.dart
│
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

---

## 🛠️ Build & Run Instructions

### 1. Prerequisites
- Flutter SDK `>=3.16.0` (Dart `>=3.2.0`)
- Android Studio / Android SDK Platform 34
- JDK 17

### 2. Install Dependencies
```bash
cd openpdf_mobile
flutter pub get
```

### 3. Run Static Analysis & Tests
```bash
flutter analyze
flutter test
```

### 4. Build Release Android APK & AAB
```bash
# Build Universal Release APK
flutter build apk --release

# Build Google Play App Bundle (AAB)
flutter build appbundle --release
```

---

## 🔒 Security & Privacy Policy

1. **No External Tracking:** User documents are never uploaded to analytics or ad networks.
2. **True Destructive Redaction:** Coordinate bounding boxes are rasterized and text streams permanently purged.
3. **Temporary Buffer Retention:** Cached files in `cacheDir` are safely expungable at any time via Settings.
