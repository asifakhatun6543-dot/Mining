import 'package:flutter/material.dart';

/// OpenPDF Studio - Master Color Palette
/// Designed for Liquid Glassmorphism across Dark & Light Modes.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // Dark Mode Palette
  // ---------------------------------------------------------------------------
  static const Color darkBackground = Color(0xFF080D18);
  static const Color darkSecondaryBackground = Color(0xFF101827);
  static const Color darkGlassSurface = Color(0x14FFFFFF); // 8% white
  static const Color darkGlassHighlight = Color(0x26FFFFFF); // 15% white
  static const Color darkBorder = Color(0x1FFFFFFF); // 12% white
  static const Color darkPrimaryAccent = Color(0xFF6C9BFF);
  static const Color darkSecondaryAccent = Color(0xFFA78BFA);
  static const Color darkPrimaryText = Color(0xFFF5F7FF);
  static const Color darkSecondaryText = Color(0xFF9BA8BD);

  // ---------------------------------------------------------------------------
  // Light Mode Palette
  // ---------------------------------------------------------------------------
  static const Color lightBackground = Color(0xFFF5F7FC);
  static const Color lightSecondaryBackground = Color(0xFFFFFFFF);
  static const Color lightGlassSurface = Color(0xBFFFFFFF); // 75% white
  static const Color lightGlassHighlight = Color(0xE6FFFFFF); // 90% white
  static const Color lightBorder = Color(0x2E64748B); // 18% slate
  static const Color lightPrimaryAccent = Color(0xFF386FE8);
  static const Color lightSecondaryAccent = Color(0xFF8762E8);
  static const Color lightPrimaryText = Color(0xFF182033);
  static const Color lightSecondaryText = Color(0xFF69758A);

  // ---------------------------------------------------------------------------
  // Brand & Semantic Colors
  // ---------------------------------------------------------------------------
  static const Color brandRed = Color(0xFFE5322D);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF0EA5E9);

  // Tool Specific Accents (DOCX, XLSX, PPTX, AI, Scanner, etc.)
  static const Color wordBlue = Color(0xFF2563EB);
  static const Color excelGreen = Color(0xFF16A34A);
  static const Color pptOrange = Color(0xFFEA580C);
  static const Color aiPurple = Color(0xFF7C3AED);
  static const Color scannerTeal = Color(0xFF0D9488);
  static const Color securityCrimson = Color(0xFFDC2626);
  static const Color imageCyan = Color(0xFF06B6D4);
  static const Color organizeAmber = Color(0xFFD97706);
}
