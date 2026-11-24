import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_export_service.dart';
import 'glass_button.dart';
import 'glass_card.dart';
import 'glass_container.dart';

/// Premium Liquid Glass Success Dialog shown when a document is exported or downloaded.
/// 
/// Displays verified file name, file size badge, public Downloads folder path,
/// and responsive action buttons: Open File, Share, and Done.
class GlassDownloadSuccessDialog extends StatelessWidget {
  final FileExportResult result;

  const GlassDownloadSuccessDialog({
    super.key,
    required this.result,
  });

  /// Displays the dialog smoothly with backdrop blur
  static Future<void> show(BuildContext context, FileExportResult result) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'DownloadSuccessDialog',
      barrierColor: Colors.black.withOpacity(0.55),
      transitionDuration: const Duration(milliseconds: 320),
      pageBuilder: (ctx, anim1, anim2) => Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Material(
            color: Colors.transparent,
            child: GlassDownloadSuccessDialog(result: result),
          ),
        ),
      ),
      transitionBuilder: (ctx, anim1, anim2, child) {
        return ScaleTransition(
          scale: CurvedAnimation(
            parent: anim1,
            curve: Curves.easeOutBack,
          ),
          child: FadeTransition(
            opacity: anim1,
            child: child,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryTextColor = isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText;
    final secondaryTextColor = isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText;

    final dotIndex = result.fileName.lastIndexOf('.');
    final ext = (dotIndex != -1 ? result.fileName.substring(dotIndex + 1) : 'FILE').toUpperCase();

    return GlassContainer(
      borderRadius: 28,
      blurSigma: 24,
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 26),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Animated Success Icon
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF10B981), Color(0xFF059669)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withOpacity(0.4),
                  blurRadius: 20,
                  spreadRadius: 2,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(
              Icons.check_rounded,
              color: Colors.white,
              size: 40,
            ),
          )
              .animate()
              .scale(
                duration: 400.ms,
                curve: Curves.easeOutBack,
              )
              .shimmer(
                duration: 1200.ms,
                color: Colors.white.withOpacity(0.4),
              ),

          const SizedBox(height: 18),

          // 2. Title & Subtitle
          Text(
            'Export Successful!',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: primaryTextColor,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Saved to public phone storage',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: secondaryTextColor,
            ),
          ),

          const SizedBox(height: 20),

          // 3. Document Details Glass Card
          GlassCard(
            borderRadius: 20,
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // File Type Icon Badge
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _getFileTypeColor(ext).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _getFileTypeColor(ext).withOpacity(0.35),
                          width: 1,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          ext,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: _getFileTypeColor(ext),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            result.fileName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: primaryTextColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withOpacity(0.08)
                                  : Colors.black.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              result.sizeFormatted,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: secondaryTextColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                ),
                const SizedBox(height: 10),
                // Saved Path Indicator
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.folder_outlined,
                      size: 16,
                      color: AppColors.brandRed,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        result.displayPath,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: primaryTextColor.withOpacity(0.85),
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 22),

          // 4. Action Buttons (Open File, Share, Done)
          Row(
            children: [
              Expanded(
                child: GlassButton(
                  label: 'Open File',
                  icon: Icons.open_in_new_rounded,
                  variant: GlassButtonVariant.primary,
                  onPressed: () {
                    FileExportService.instance.openExportedFile(result);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GlassButton(
                  label: 'Share',
                  icon: Icons.share_rounded,
                  variant: GlassButtonVariant.secondary,
                  onPressed: () {
                    FileExportService.instance.shareExportedFile(result);
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
              foregroundColor: secondaryTextColor,
            ),
            child: const Text(
              'Done',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getFileTypeColor(String ext) {
    switch (ext) {
      case 'PDF':
        return AppColors.brandRed;
      case 'DOCX':
      case 'DOC':
      case 'RTF':
        return const Color(0xFF2B579A); // Word Blue
      case 'XLSX':
      case 'XLS':
      case 'CSV':
        return const Color(0xFF217346); // Excel Green
      case 'PPTX':
      case 'PPT':
        return const Color(0xFFD24726); // PowerPoint Orange
      case 'JPG':
      case 'JPEG':
      case 'PNG':
      case 'WEBP':
        return const Color(0xFF8B5CF6); // Purple
      case 'ZIP':
        return const Color(0xFFF59E0B); // Amber
      default:
        return const Color(0xFF06B6D4); // Cyan
    }
  }
}
