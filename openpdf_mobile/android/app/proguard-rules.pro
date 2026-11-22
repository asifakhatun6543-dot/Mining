# Flutter Proguard Rules for Release APK & AAB
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Google ML Kit Text Recognition Proguard
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-keepattributes *Annotation*
-dontwarn com.google.android.gms.**

# Syncfusion & PDF rendering libraries
-keep class com.syncfusion.** { *; }
-dontwarn com.syncfusion.**

# JNI & Native Platform Channels
-keepclasseswithmembernames class * {
    native <methods>;
}

# Deferred components & Play Core
-dontwarn com.google.android.play.core.**
-dontwarn io.flutter.embedding.engine.deferredcomponents.**

# ML Kit optional languages
-dontwarn com.google.mlkit.vision.text.**
-dontwarn com.google_mlkit_text_recognition.**
-keep class com.google_mlkit_text_recognition.** { *; }
