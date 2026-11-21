import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../domain/entities/tool_entity.dart';
import 'glass_card.dart';

/// OpenPDF Studio - Liquid Glass Tool Card for Grids & Lists
class GlassToolCard extends StatelessWidget {
  final ToolEntity tool;
  final VoidCallback onTap;
  final VoidCallback? onFavoriteToggle;

  const GlassToolCard({
    super.key,
    required this.tool,
    required this.onTap,
    this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      onTap: onTap,
      borderRadius: 22,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Top Row: Icon + Badge / Favorite
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: tool.accentColor.withOpacity(isDark ? 0.22 : 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: tool.accentColor.withOpacity(isDark ? 0.4 : 0.25),
                    width: 1,
                  ),
                ),
                child: Icon(
                  tool.icon,
                  size: 22,
                  color: tool.accentColor,
                ),
              ),
              if (tool.badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A0F172A),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? const Color(0x22FFFFFF) : const Color(0x120F172A),
                      width: 0.8,
                    ),
                  ),
                  child: Text(
                    tool.badge!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
            ],
          ),

          const Spacer(),

          // Middle: Title & Description
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tool.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                tool.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w400,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                  height: 1.35,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Bottom Action Indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                tool.categoryName,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: tool.accentColor,
                ),
              ),
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0x1FFFFFFF) : const Color(0x0F000000),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.north_east_rounded,
                  size: 14,
                  color: tool.accentColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
