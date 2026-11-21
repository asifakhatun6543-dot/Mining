import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'glass_card.dart';

enum GlassButtonVariant {
  primary,
  secondary,
  outline,
  danger,
}

/// OpenPDF Studio - Liquid Glass Action Button
class GlassButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final GlassButtonVariant variant;
  final bool isLoading;
  final double? width;
  final double height;
  final double borderRadius;

  const GlassButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = GlassButtonVariant.primary,
    this.isLoading = false,
    this.width,
    this.height = 52.0,
    this.borderRadius = 26.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color textColor = Colors.white;
    Color? surfaceColor;
    Color? borderColor;
    Gradient? gradient;

    switch (variant) {
      case GlassButtonVariant.primary:
        gradient = const LinearGradient(
          colors: [AppColors.brandRed, Color(0xFFF43F5E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
        borderColor = Colors.white.withOpacity(0.3);
        textColor = Colors.white;
        break;

      case GlassButtonVariant.secondary:
        surfaceColor = isDark ? AppColors.darkGlassSurface : AppColors.lightGlassSurface;
        borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
        textColor = isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText;
        break;

      case GlassButtonVariant.outline:
        surfaceColor = Colors.transparent;
        borderColor = isDark ? AppColors.darkPrimaryAccent : AppColors.lightPrimaryAccent;
        textColor = isDark ? AppColors.darkPrimaryAccent : AppColors.lightPrimaryAccent;
        break;

      case GlassButtonVariant.danger:
        gradient = const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
        textColor = Colors.white;
        break;
    }

    return SizedBox(
      width: width,
      height: height,
      child: GlassCard(
        borderRadius: borderRadius,
        surfaceColor: surfaceColor,
        borderColor: borderColor,
        gradient: gradient,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        onTap: isLoading ? null : onPressed,
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 20, color: textColor),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: textColor,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
