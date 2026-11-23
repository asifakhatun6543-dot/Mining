import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../core/services/cloud_storage_service.dart';
import '../../../data/datasources/tools_data.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_card.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/document_actions_sheet.dart';
import '../../tools/screens/tool_workspace_screen.dart';
import '../../tools/screens/pdf_editor_canvas_screen.dart';
import '../../tools/screens/pdf_editor_webview_screen.dart';

/// OpenPDF Studio - Next-Gen Clean Mobile Dashboard
/// High-end typography, rapid workflow shortcuts, category filtering,
/// cloud storage launchers, and document history with 3-dot actions drawer.
class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _searchQuery = '';
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Edit & Sign',
    'Convert',
    'Optimize',
    'Security',
    'Organize',
  ];

  void _openTool(ToolEntity tool) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ToolWorkspaceScreen(tool: tool)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;

    // Filtered tools based on search and category
    final displayedTools = ToolsData.allTools.where((tool) {
      final matchesSearch = _searchQuery.isEmpty ||
          tool.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().contains(_searchQuery.toLowerCase());
      if (_selectedCategory == 'All') return matchesSearch;
      if (_selectedCategory == 'Convert') {
        return matchesSearch && (tool.category.name.toLowerCase().contains('convert') || tool.id.contains('convert') || tool.id.contains('to_'));
      }
      if (_selectedCategory == 'Edit & Sign') {
        return matchesSearch && (tool.id.contains('edit') || tool.id.contains('sign') || tool.id.contains('watermark') || tool.id.contains('redact'));
      }
      if (_selectedCategory == 'Optimize') {
        return matchesSearch && (tool.id.contains('compress') || tool.id.contains('ocr') || tool.id.contains('scanner'));
      }
      if (_selectedCategory == 'Security') {
        return matchesSearch && (tool.id.contains('lock') || tool.id.contains('unlock') || tool.id.contains('protect'));
      }
      if (_selectedCategory == 'Organize') {
        return matchesSearch && (tool.id.contains('merge') || tool.id.contains('split') || tool.id.contains('rotate') || tool.id.contains('page'));
      }
      return matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. Header Bar: Studio Title, Online Status & Profile Avatar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Row(
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
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                letterSpacing: -0.6,
                              ),
                            ),
                            const SizedBox(width: 5),
                            const Text('🫰', style: TextStyle(fontSize: 20)),
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: primaryAccent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'STUDIO',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
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
                              '23 Pro Document Engines • 100% Local',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    // Profile Button (Navigates to Profile Tab)
                    InkWell(
                      onTap: () => widget.onNavigateTab(3), // Jump to Profile
                      borderRadius: BorderRadius.circular(50),
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
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
              ),
            ),

            // 2. Search Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: GlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                    ),
                    decoration: InputDecoration(
                      icon: Icon(
                        Icons.search_rounded,
                        size: 20,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                      ),
                      hintText: 'Search tools, convert, compress, sign...',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
              ),
            ),

            // 3. Primary Quick Action Hub (Edit, Convert, Compress, Sign)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
                child: Row(
                  children: [
                    _buildHeroActionCard(
                      title: 'Edit PDF',
                      subtitle: 'Vector & text',
                      icon: Icons.edit_note_rounded,
                      color: const Color(0xFFFF2A55),
                      isDark: isDark,
                      onTap: () async {
                        final tool = ToolsData.allTools.firstWhere((t) => t.id == 'edit-pdf');
                        final doc = await FileService.instance.pickPdfFile();
                        if (doc != null && mounted) {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => PdfEditorWebViewScreen(pdfFile: File(doc.path))),
                          );
                        } else if (mounted) {
                          _openTool(tool);
                        }
                      },
                    ),
                    const SizedBox(width: 10),
                    _buildHeroActionCard(
                      title: 'Convert',
                      subtitle: 'Word, Excel, PPT',
                      icon: Icons.transform_rounded,
                      color: const Color(0xFF3B82F6),
                      isDark: isDark,
                      onTap: () {
                        final tool = ToolsData.allTools.firstWhere((t) => t.id == 'pdf-to-word');
                        _openTool(tool);
                      },
                    ),
                    const SizedBox(width: 10),
                    _buildHeroActionCard(
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
                    _buildHeroActionCard(
                      title: 'Sign & Draw',
                      subtitle: 'Touch stamp',
                      icon: Icons.draw_rounded,
                      color: const Color(0xFFF59E0B),
                      isDark: isDark,
                      onTap: () {
                        final tool = ToolsData.allTools.firstWhere((t) => t.id == 'sign-pdf');
                        _openTool(tool);
                      },
                    ),
                  ],
                ),
              ),
            ),

            // 4. Cloud Quick Access Bar (Google Drive, Dropbox, OneDrive, Device)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.white : Colors.black).withOpacity(0.03),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: (isDark ? Colors.white : Colors.black).withOpacity(0.06),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildCloudShortcut(Icons.phone_android_rounded, 'Device', const Color(0xFF64748B), isDark),
                      _buildCloudShortcut(Icons.add_to_drive_rounded, 'Drive', const Color(0xFF34A853), isDark),
                      _buildCloudShortcut(Icons.cloud_queue_rounded, 'Dropbox', const Color(0xFF0061FE), isDark),
                      _buildCloudShortcut(Icons.cloud_done_rounded, 'OneDrive', const Color(0xFF0078D4), isDark),
                    ],
                  ),
                ),
              ),
            ),

            // 5. Category Chips Row
            SliverToBoxAdapter(
              child: SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  itemCount: _categories.length,
                  itemBuilder: (context, i) {
                    final cat = _categories[i];
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: ChoiceChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _selectedCategory = cat),
                        selectedColor: primaryAccent,
                        backgroundColor: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.white : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected ? Colors.transparent : (isDark ? Colors.white10 : Colors.black12),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 14)),

            // 6. Tools Grid Section Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$_selectedCategory Tools (${displayedTools.length})',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      ),
                    ),
                    InkWell(
                      onTap: () => widget.onNavigateTab(1), // All Tools tab
                      child: Text(
                        'View All ↗',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: primaryAccent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 10)),

            // Tools Grid (Clean 2-Column Layout)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.55,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final tool = displayedTools[index];
                    return InkWell(
                      onTap: () => _openTool(tool),
                      borderRadius: BorderRadius.circular(16),
                      child: GlassContainer(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: tool.accentColor.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    tool.icon,
                                    size: 18,
                                    color: tool.accentColor,
                                  ),
                                ),
                                if (tool.isPopular)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'POPULAR',
                                      style: TextStyle(
                                        color: Color(0xFF10B981),
                                        fontSize: 8,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tool.title,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  tool.description,
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: displayedTools.length,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // 7. Recent Activity Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recent Documents',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      ),
                    ),
                    InkWell(
                      onTap: () => widget.onNavigateTab(3), // Profile tab
                      child: Text(
                        'History ↗',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: primaryAccent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 8)),

            // Recent Documents List with 3-Dot Actions Drawer
            ListenableBuilder(
              listenable: HistoryService.instance,
              builder: (context, _) {
                final items = HistoryService.instance.items.take(3).toList();
                if (items.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GlassContainer(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Text(
                            'Processed files will appear here',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = items[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassContainer(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            child: Row(
                              children: [
                                Icon(Icons.picture_as_pdf_rounded, color: primaryAccent, size: 22),
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
                                          fontSize: 10.5,
                                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // 3-Dot Action Button
                                IconButton(
                                  icon: const Icon(Icons.more_vert_rounded, size: 18),
                                  onPressed: () {
                                    DocumentActionsSheet.show(
                                      context,
                                      item: item,
                                      documentTitle: item.fileName,
                                      documentPath: item.filePath,
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: items.length,
                    ),
                  ),
                );
              },
            ),

            // 8. Bottom Branding: Built with love 🫰 RS7 Private Limited
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 110),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Built with love',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Text('🫰', style: TextStyle(fontSize: 13)),
                        const SizedBox(width: 4),
                        Text(
                          'RS7 Private Limited',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroActionCard({
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
            color: color.withOpacity(isDark ? 0.16 : 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: color.withOpacity(isDark ? 0.35 : 0.2),
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 9.5,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCloudShortcut(IconData icon, String label, Color color, bool isDark) {
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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
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
