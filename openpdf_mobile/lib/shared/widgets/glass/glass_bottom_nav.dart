import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// OpenPDF Studio - Floating Liquid Glass Bottom Navigation Bar
class GlassBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final int historyCount;

  const GlassBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
    this.historyCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: bottomPadding > 0 ? bottomPadding + 6 : 18,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(9999),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            height: 66,
            decoration: BoxDecoration(
              color: isDark ? const Color(0x22FFFFFF) : const Color(0xCFFFFFFF),
              borderRadius: BorderRadius.circular(9999),
              border: Border.all(
                color: isDark ? const Color(0x33FFFFFF) : const Color(0x66FFFFFF),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.35 : 0.12),
                  blurRadius: 32,
                  offset: const Offset(0, 12),
                  spreadRadius: -4,
                ),
                BoxShadow(
                  color: (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed).withOpacity(0.14),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final tabWidth = constraints.maxWidth / 4;

                return Stack(
                  alignment: Alignment.centerLeft,
                  children: [
                    // Animated Sliding Liquid Indicator Bubble
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 360),
                      curve: Curves.easeOutBack,
                      left: currentIndex * tabWidth + 5,
                      width: tabWidth - 10,
                      top: 6,
                      bottom: 6,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? [
                                    AppColors.darkPrimaryAccent.withOpacity(0.24),
                                    AppColors.darkSecondaryAccent.withOpacity(0.28),
                                  ]
                                : [
                                    AppColors.brandRed.withOpacity(0.14),
                                    const Color(0xFFF43F5E).withOpacity(0.18),
                                  ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(9999),
                          border: Border.all(
                            color: isDark
                                ? AppColors.darkPrimaryAccent.withOpacity(0.4)
                                : AppColors.brandRed.withOpacity(0.3),
                            width: 1.0,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed).withOpacity(0.18),
                              blurRadius: 14,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // 4 Navigation Items
                    Row(
                      children: [
                        _buildNavItem(
                          index: 0,
                          label: 'Home',
                          icon: Icons.home_rounded,
                          width: tabWidth,
                          isDark: isDark,
                        ),
                        _buildNavItem(
                          index: 1,
                          label: 'All Tools',
                          icon: Icons.grid_view_rounded,
                          width: tabWidth,
                          isDark: isDark,
                        ),
                        _buildNavItem(
                          index: 2,
                          label: 'Chat AI',
                          icon: Icons.auto_awesome_rounded,
                          width: tabWidth,
                          isDark: isDark,
                          showAiSparkle: true,
                        ),
                        _buildNavItem(
                          index: 3,
                          label: 'Profile',
                          icon: Icons.person_rounded,
                          width: tabWidth,
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required String label,
    required IconData icon,
    required double width,
    required bool isDark,
    bool showAiSparkle = false,
    int badgeCount = 0,
  }) {
    final isSelected = currentIndex == index;
    final activeColor = isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed;
    final inactiveColor = isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText;

    return SizedBox(
      width: width,
      height: double.infinity,
      child: GestureDetector(
        onTap: () => onTabSelected(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedScale(
                  scale: isSelected ? 1.15 : 1.0,
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOutCubic,
                  child: Icon(
                    icon,
                    size: 22,
                    color: isSelected ? activeColor : inactiveColor,
                  ),
                ),
                if (showAiSparkle)
                  Positioned(
                    top: -2,
                    right: -3,
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: activeColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: activeColor.withOpacity(0.8),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                  ),
                if (badgeCount > 0)
                  Positioned(
                    top: -4,
                    right: -8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: activeColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        badgeCount > 9 ? '9+' : '$badgeCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? activeColor : inactiveColor,
                letterSpacing: -0.2,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
