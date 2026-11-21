import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../config/theme/glass_theme.dart';

/// OpenPDF Studio - Foundation Liquid Glass Container
class GlassContainer extends StatelessWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final double blurSigma;
  final Color? surfaceColor;
  final Color? borderColor;
  final Gradient? gradient;
  final List<BoxShadow>? shadows;
  final VoidCallback? onTap;

  const GlassContainer({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.borderRadius = 24.0,
    this.blurSigma = 20.0,
    this.surfaceColor,
    this.borderColor,
    this.gradient,
    this.shadows,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final glassTheme = isDark ? GlassTheme.dark() : GlassTheme.light();

    Widget content = Container(
      width: width,
      height: height,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: glassTheme.decoration(
        radius: borderRadius,
        customSurface: surfaceColor,
        customBorder: borderColor,
        customShadows: shadows,
        customGradient: gradient,
      ),
      child: child,
    );

    // Apply selective backdrop blur safely
    content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
        child: content,
      ),
    );

    if (margin != null) {
      content = Padding(padding: margin!, child: content);
    }

    if (onTap != null) {
      content = GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: content,
      );
    }

    return content;
  }
}
