import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../core/services/cloud_storage_service.dart';
import '../../../data/datasources/tools_data.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import '../../tools/screens/tool_workspace_screen.dart';
import '../../tools/screens/pdf_editor_webview_screen.dart';

/// PDF 🫰 Studio - Executive Modern Dashboard
/// Clean, stable layout with ClampingScrollPhysics (no bouncy overscroll or accidental swipe).
/// Quick Actions: In-Place PDF Editor, Cloud Document Importers, AI Intelligence & File History.
class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _searchQuery = '';

  void _openTool(ToolEntity tool) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ToolWorkspaceScreen(tool: tool)),
    );
  }

  Future<void> _launchPdfEditor() async {
    final doc = await FileService.instance.pickPdfFile();
    if (doc != null && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PdfEditorWebViewScreen(pdfFile: File(doc.path))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(), // Solid, controlled touch response
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 96),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Top Brand Header Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'PDF',
                            style: TextStyle(
                              fontSize: 25,
                              fontWeight: FontWeight.w900,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text('🫰', style: TextStyle(fontSize: 22)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFF1744), Color(0xFFBE123C)],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'STUDIO',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '100% Private On-Device Processing',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Profile Avatar Button (Jumps to Profile Tab)
                  InkWell(
                    onTap: () => widget.onNavigateTab(3),
                    borderRadius: BorderRadius.circular(50),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (isDark ? Colors.white : Colors.black).withOpacity(0.06),
                        border: Border.all(
                          color: primaryAccent.withOpacity(0.4),
                          width: 1.5,
                        ),
                      ),
                      child: Icon(Icons.person_rounded, size: 22, color: primaryAccent),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 2. Executive Hero Banner: "Edit PDF & In-Place Document Studio"
              InkWell(
                onTap: _launchPdfEditor,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isDark
                          ? [const Color(0xFF1E1428), const Color(0xFF131A2E)]
                          : [const Color(0xFFFFF1F2), const Color(0xFFEFF6FF)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: primaryAccent.withOpacity(0.35),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: primaryAccent.withOpacity(isDark ? 0.2 : 0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF1744), Color(0xFFBE123C)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF1744).withOpacity(0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.edit_document, size: 28, color: Colors.white),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Edit PDF Document',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981).withOpacity(0.18),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    '17 Tools',
                                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'In-place text editing, signatures, shapes, highlight & export',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios_rounded, size: 16, color: primaryAccent),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // 3. Quick Action Hub (4 Primary Engines)
              Row(
                children: [
                  _buildQuickActionCard(
                    title: 'Convert',
                    subtitle: 'To Word/Excel',
                    icon: Icons.transform_rounded,
                    color: const Color(0xFF3B82F6),
                    isDark: isDark,
                    onTap: () {
                      final tool = ToolsData.allTools.firstWhere((t) => t.id == 'pdf-to-word');
                      _openTool(tool);
                    },
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionCard(
                    title: 'Compress',
                    subtitle: 'Custom size',
                    icon: Icons.compress_rounded,
                    color: const Color(0xFF10B981),
                    isDark: isDark,
                    onTap: () {
                      final tool = ToolsData.allTools.firstWhere((t) => t.id == 'compress-pdf');
                      _openTool(tool);
                    },
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionCard(
                    title: 'Sign & Form',
                    subtitle: 'Finger stamp',
                    icon: Icons.draw_rounded,
                    color: const Color(0xFFF59E0B),
                    isDark: isDark,
                    onTap: () {
                      final tool = ToolsData.allTools.firstWhere((t) => t.id == 'sign-pdf');
                      _openTool(tool);
                    },
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionCard(
                    title: 'OCR Scan',
                    subtitle: 'Image to Text',
                    icon: Icons.document_scanner_rounded,
                    color: const Color(0xFF8B5CF6),
                    isDark: isDark,
                    onTap: () {
                      final tool = ToolsData.allTools.firstWhere((t) => t.id == 'ocr');
                      _openTool(tool);
                    },
                  ),
                ],
              ),

              const SizedBox(height: 18),

              // 4. Cloud Storage Quick Upload Hub (Device, Drive, Dropbox, OneDrive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (isDark ? Colors.white : Colors.black).withOpacity(0.07),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Direct Cloud Import',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          ),
                        ),
                        Text(
                          'SAF Verified',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildCloudPill(Icons.phone_android_rounded, 'Device', const Color(0xFF64748B), isDark),
                        _buildCloudPill(Icons.add_to_drive_rounded, 'Drive', const Color(0xFF34A853), isDark),
                        _buildCloudPill(Icons.cloud_queue_rounded, 'Dropbox', const Color(0xFF0061FE), isDark),
                        _buildCloudPill(Icons.cloud_done_rounded, 'OneDrive', const Color(0xFF0078D4), isDark),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // 5. ChatGPT-Style Document AI Assistant Card
              InkWell(
                onTap: () => widget.onNavigateTab(2), // Jump to Chat AI tab
                borderRadius: BorderRadius.circular(18),
                child: GlassContainer(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Document AI Assistant',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Summarize, translate to Hindi, extract dates and tables instantly.',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: isDark ? Colors.white54 : Colors.black45),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // 6. Recent Documents Section with 3-Dot Actions Sheet
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Documents',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                    ),
                  ),
                  TextButton(
                    onPressed: () => widget.onNavigateTab(3), // View History in Profile
                    child: Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: primaryAccent,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              ListenableBuilder(
                listenable: HistoryService.instance,
                builder: (context, _) {
                  final items = HistoryService.instance.items;
                  if (items.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                      decoration: BoxDecoration(
                        color: (isDark ? Colors.white : Colors.black).withOpacity(0.02),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: (isDark ? Colors.white : Colors.black).withOpacity(0.05)),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.description_outlined, size: 32, color: isDark ? Colors.white24 : Colors.black26),
                            const SizedBox(height: 8),
                            Text(
                              'No documents edited yet',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white54 : Colors.black54,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Tap "Edit PDF Document" above to get started',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: items.take(3).map((item) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: GlassContainer(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: primaryAccent.withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(Icons.picture_as_pdf_rounded, color: primaryAccent, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.fileName,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      '${item.toolUsed} • ${item.sizeFormatted}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.more_vert_rounded, size: 20),
                                color: isDark ? Colors.white70 : Colors.black54,
                                onPressed: () {
                                  DocumentActionsSheet.show(
                                    context,
                                    item: item,
                                    documentTitle: item.fileName,
                                    documentPath: item.filePath,
                                    onActionCompleted: () => setState(() {}),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: (isDark ? Colors.white : Colors.black).withOpacity(isDark ? 0.05 : 0.03),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.06),
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(isDark ? 0.22 : 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 10,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCloudPill(IconData icon, String label, Color color, bool isDark) {
    return InkWell(
      onTap: () async {
        final doc = await CloudStorageService.instance.pickDocumentFromCloud(
          context: context,
          provider: label == 'Device' ? 'Device Storage' : label,
        );
        if (doc != null && mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PdfEditorWebViewScreen(pdfFile: File(doc.path))),
          );
        }
      },
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
