import 'package:flutter/material.dart';
import 'glass_container.dart';

/// OpenPDF Studio - Interactive Liquid Glass Card
class GlassCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? surfaceColor;
  final Color? borderColor;
  final Gradient? gradient;

  const GlassCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.borderRadius = 22.0,
    this.surfaceColor,
    this.borderColor,
    this.gradient,
  });

  @override
  State<GlassCard> createState() => _GlassCardState();
}

class _GlassCardState extends State<GlassCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 140),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.965).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails _) {
    if (widget.onTap != null) _controller.forward();
  }

  void _onTapUp(TapUpDetails _) {
    if (widget.onTap != null) _controller.reverse();
  }

  void _onTapCancel() {
    if (widget.onTap != null) _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: GestureDetector(
        onTapDown: _onTapDown,
        onTapUp: _onTapUp,
        onTapCancel: _onTapCancel,
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: GlassContainer(
          borderRadius: widget.borderRadius,
          padding: widget.padding,
          margin: widget.margin,
          surfaceColor: widget.surfaceColor,
          borderColor: widget.borderColor,
          gradient: widget.gradient,
          child: widget.child,
        ),
      ),
    );
  }
}
