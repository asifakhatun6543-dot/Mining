import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// OpenPDF Studio - Liquid Glass Design System Specifications
class GlassTheme {
  final bool isDark;
  final double blurSigma;
  final double defaultRadius;
  final Color surfaceColor;
  final Color highlightColor;
  final Color borderColor;
  final List<BoxShadow> shadows;

  const GlassTheme({
    required this.isDark,
    this.blurSigma = 20.0,
    this.defaultRadius = 24.0,
    required this.surfaceColor,
    required this.highlightColor,
    required this.borderColor,
    required this.shadows,
  });

  factory GlassTheme.dark() {
    return GlassTheme(
      isDark: true,
      blurSigma: 22.0,
      defaultRadius: 24.0,
      surfaceColor: const Color(0x18FFFFFF), // 9% white
      highlightColor: const Color(0x28FFFFFF), // 16% white top specular
      borderColor: const Color(0x24FFFFFF), // 14% white border
      shadows: [
        BoxShadow(
          color: Colors.black.withOpacity(0.4),
          blurRadius: 32,
          offset: const Offset(0, 14),
          spreadRadius: -4,
        ),
        BoxShadow(
          color: AppColors.darkPrimaryAccent.withOpacity(0.06),
          blurRadius: 20,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  factory GlassTheme.light() {
    return GlassTheme(
      isDark: false,
      blurSigma: 22.0,
      defaultRadius: 24.0,
      surfaceColor: const Color(0xD8FFFFFF), // 85% white
      highlightColor: const Color(0xF2FFFFFF), // 95% specular highlight
      borderColor: const Color(0x3894A3B8), // 22% slate border
      shadows: [
        BoxShadow(
          color: const Color(0x1A0F172A),
          blurRadius: 30,
          offset: const Offset(0, 12),
          spreadRadius: -4,
        ),
        BoxShadow(
          color: AppColors.lightPrimaryAccent.withOpacity(0.08),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }

  BoxDecoration decoration({
    double? radius,
    Color? customSurface,
    Color? customBorder,
    List<BoxShadow>? customShadows,
    Gradient? customGradient,
  }) {
    final r = radius ?? defaultRadius;
    return BoxDecoration(
      color: customGradient == null ? (customSurface ?? surfaceColor) : null,
      gradient: customGradient,
      borderRadius: BorderRadius.circular(r),
      border: Border.all(
        color: customBorder ?? borderColor,
        width: 1.0,
      ),
      boxShadow: customShadows ?? shadows,
    );
  }
}
