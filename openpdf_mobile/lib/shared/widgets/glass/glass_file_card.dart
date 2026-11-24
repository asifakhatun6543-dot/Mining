import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/history_service.dart';
import '../../../domain/entities/history_entity.dart';
import '../document_actions_sheet.dart';
import 'glass_card.dart';

/// OpenPDF Studio - Document History File Card
class GlassFileCard extends StatelessWidget {
  final HistoryEntity item;
  final VoidCallback onTap;
  final VoidCallback? onShare;
  final VoidCallback? onDelete;
  final VoidCallback? onMore;

  const GlassFileCard({
    super.key,
    required this.item,
    required this.onTap,
    this.onShare,
    this.onDelete,
    this.onMore,
  });

  Color _getTypeColor() {
    final t = item.fileType.toLowerCase();
    if (t.contains('word') || t == 'docx' || t == 'doc') return AppColors.wordBlue;
    if (t.contains('excel') || t == 'xlsx' || t == 'csv') return AppColors.excelGreen;
    if (t.contains('ppt') || t == 'pptx') return AppColors.pptOrange;
    if (t.contains('ai') || t == 'chat') return AppColors.aiPurple;
    if (t.contains('scan')) return AppColors.scannerTeal;
    if (t.contains('image') || t == 'jpg' || t == 'png') return AppColors.imageCyan;
    return AppColors.brandRed;
  }

  IconData _getTypeIcon() {
    final t = item.fileType.toLowerCase();
    if (t.contains('word') || t == 'docx') return Icons.description_rounded;
    if (t.contains('excel') || t == 'xlsx' || t == 'csv') return Icons.table_chart_rounded;
    if (t.contains('ppt') || t == 'pptx') return Icons.slideshow_rounded;
    if (t.contains('ai') || t == 'chat') return Icons.auto_awesome_rounded;
    if (t.contains('scan')) return Icons.document_scanner_rounded;
    if (t.contains('image')) return Icons.image_rounded;
    return Icons.picture_as_pdf_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = _getTypeColor();

    return GlassCard(
      onTap: onTap,
      borderRadius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          // Left File Icon Container
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(isDark ? 0.2 : 0.12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: color.withOpacity(isDark ? 0.4 : 0.25),
                width: 1,
              ),
            ),
            child: Icon(_getTypeIcon(), size: 22, color: color),
          ),

          const SizedBox(width: 12),

          // Details: Name, Tool badge, Size, Time
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.fileName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: color.withOpacity(isDark ? 0.22 : 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        item.toolUsed,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '•',
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item.sizeFormatted,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '•',
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item.relativeTime,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Favorite Star Toggle
          IconButton(
            icon: Icon(
              item.isFavorite ? Icons.star_rounded : Icons.star_border_rounded,
              size: 20,
              color: item.isFavorite ? const Color(0xFFF59E0B) : (isDark ? Colors.white38 : Colors.black38),
            ),
            tooltip: item.isFavorite ? 'Remove Favorite' : 'Add to Favorites',
            onPressed: () => HistoryService.instance.toggleFavorite(item.id),
            visualDensity: VisualDensity.compact,
          ),

          // 3-Dot Actions Drawer Button (All 15 Actions)
          IconButton(
            icon: const Icon(Icons.more_vert_rounded, size: 20),
            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
            tooltip: 'Document Actions',
            onPressed: onMore ??
                () {
                  DocumentActionsSheet.show(
                    context,
                    item: item,
                    documentTitle: item.fileName,
                    documentPath: item.filePath,
                  );
                },
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
