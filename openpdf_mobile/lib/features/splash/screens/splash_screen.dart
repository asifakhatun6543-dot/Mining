import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_strings.dart';
import '../../shell/screens/main_shell_screen.dart';

/// OpenPDF Studio - Luxury Non-Scrollable Cinematic Splash Screen
/// Strictly fixed fullscreen (no swipe/drag/scroll).
/// Features:
/// - Minimalist neon ambient glow
/// - Sleek 3D PDF Studio Monogram
/// - Korean Finger Heart Love branding: "Built with love 🫰 RS7 Private Limited"
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.2, 1.0, curve: Curves.easeInOut),
    );

    _controller.forward();

    // Auto-transition after 2 seconds to MainShellScreen
    Timer(const Duration(milliseconds: 2000), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, animation, __) => const MainShellScreen(),
            transitionsBuilder: (_, animation, __, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 400),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Strictly fixed non-scrollable Scaffold with pointer gestures absorbed
    return Scaffold(
      backgroundColor: const Color(0xFF090D16), // Deep velvet obsidian
      resizeToAvoidBottomInset: false,
      body: AbsorbPointer(
        absorbing: true, // Prevents any accidental touch/swipe interaction
        child: SizedBox.expand(
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Radial Ambient Glowing Orb
              Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFFF1744).withValues(alpha: 0.16),
                      const Color(0xFFE11D48).withValues(alpha: 0.05),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),

              // Central Brand Identity
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ScaleTransition(
                    scale: _scaleAnimation,
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF1744), Color(0xFFBE123C)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF1744).withValues(alpha: 0.4),
                            blurRadius: 36,
                            offset: const Offset(0, 16),
                          ),
                          BoxShadow(
                            color: Colors.white.withValues(alpha: 0.2),
                            blurRadius: 1,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Positioned(
                            top: 0,
                            right: 0,
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.28),
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(26),
                                  bottomLeft: Radius.circular(12),
                                ),
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.picture_as_pdf_rounded,
                            size: 48,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  FadeTransition(
                    opacity: _fadeAnimation,
                    child: Column(
                      children: [
                        const Text(
                          AppStrings.appName,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'The Modern Document Studio',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.55),
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Bottom Branding: [ Built with love 🫰 RS7 Private Limited ]
              Positioned(
                bottom: 40,
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.04),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Built with love',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.7),
                          ),
                        ),
                        const SizedBox(width: 5),
                        // Korean Finger Heart Icon 🫰
                        const Text(
                          '🫰',
                          style: TextStyle(fontSize: 13),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          'RS7 Private Limited',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white.withValues(alpha: 0.9),
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
