import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../data/datasources/tools_data.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_card.dart';
import '../../../shared/widgets/glass/glass_search_bar.dart';
import '../../../shared/widgets/glass/glass_tool_card.dart';
import '../../../shared/widgets/glass/glass_file_card.dart';
import '../../tools/screens/tool_workspace_screen.dart';
import '../../settings/screens/settings_screen.dart';

/// OpenPDF Studio - Mobile Executive Home Dashboard
class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return AppStrings.greetingMorning;
    if (hour < 17) return AppStrings.greetingAfternoon;
    return AppStrings.greetingEvening;
  }

  void _openTool(ToolEntity tool) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ToolWorkspaceScreen(tool: tool)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final popularTools = ToolsData.allTools.where((t) => t.isPopular).take(6).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. Header (Logo, Greeting, Settings Gear)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getGreeting(),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: AppColors.brandRed,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Text('P', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'OpenPDF Studio',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                letterSpacing: -0.4,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined, size: 24),
                      color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SettingsScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            // 2. Executive Smart Search
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassSearchBar(
                  onFilterTap: () => widget.onNavigateTab(1), // Go to All Tools
                  onChanged: (val) {
                    if (val.trim().isNotEmpty) {
                      widget.onNavigateTab(1);
                    }
                  },
                ),
              ),
            ),

            // 3. Quick Action Floating Pill Shortcuts
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppStrings.quickActionsTitle,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildQuickActionTile('Edit PDF', Icons.edit_note_rounded, AppColors.brandRed, 'edit-pdf'),
                        const SizedBox(width: 10),
                        _buildQuickActionTile('Compress', Icons.compress_rounded, AppColors.success, 'compress-pdf'),
                        const SizedBox(width: 10),
                        _buildQuickActionTile('Merge', Icons.call_merge_rounded, AppColors.organizeAmber, 'merge-pdf'),
                        const SizedBox(width: 10),
                        _buildQuickActionTile('Scanner', Icons.document_scanner_rounded, AppColors.scannerTeal, 'pdf-scanner'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 4. "Your Documents, Understood" AI Assistant Card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
                child: GlassCard(
                  onTap: () => widget.onNavigateTab(2), // Switch to Chat AI
                  gradient: LinearGradient(
                    colors: isDark
                        ? [
                            AppColors.aiPurple.withOpacity(0.28),
                            AppColors.darkPrimaryAccent.withOpacity(0.18),
                          ]
                        : [
                            AppColors.aiPurple.withOpacity(0.14),
                            AppColors.lightPrimaryAccent.withOpacity(0.08),
                          ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderColor: AppColors.aiPurple.withOpacity(0.35),
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppColors.aiPurple, Color(0xFFA855F7)]),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(color: AppColors.aiPurple.withOpacity(0.35), blurRadius: 16, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              AppStrings.aiCardTitle,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              AppStrings.aiCardSubtitle,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.aiPurple),
                    ],
                  ),
                ),
              ),
            ),

            // 5. Popular Tools Header & Grid
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 26, 20, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppStrings.popularToolsTitle,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        letterSpacing: -0.3,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => widget.onNavigateTab(1), // All tools
                      child: const Text(
                        AppStrings.viewAll,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.brandRed),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.95,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final tool = popularTools[index];
                    return GlassToolCard(
                      tool: tool,
                      onTap: () => _openTool(tool),
                    );
                  },
                  childCount: popularTools.length,
                ),
              ),
            ),

            // 6. Recent Documents Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppStrings.recentDocumentsTitle,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        letterSpacing: -0.3,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => widget.onNavigateTab(3), // History tab
                      child: const Text(
                        AppStrings.viewAll,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.brandRed),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Animated Builder on HistoryService
            ListenableBuilder(
              listenable: HistoryService.instance,
              builder: (context, _) {
                final items = HistoryService.instance.items.take(3).toList();

                if (items.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                      child: GlassContainer(
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        child: Column(
                          children: [
                            Icon(Icons.folder_open_rounded, size: 38, color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6)),
                            const SizedBox(height: 8),
                            Text(
                              AppStrings.noRecentDocs,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              AppStrings.noRecentDocsDesc,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 110),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = items[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: GlassFileCard(
                            item: item,
                            onTap: () {
                              if (item.filePath != null) {
                                FileService.instance.shareFile(item.filePath!);
                              }
                            },
                            onShare: item.filePath != null
                                ? () => FileService.instance.shareFile(item.filePath!)
                                : null,
                            onDelete: () => HistoryService.instance.removeRecord(item.id),
                          ),
                        );
                      },
                      childCount: items.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionTile(String label, IconData icon, Color color, String toolId) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tool = ToolsData.allTools.firstWhere((t) => t.id == toolId, orElse: () => ToolsData.allTools.first);

    return Expanded(
      child: GlassCard(
        onTap: () => _openTool(tool),
        borderRadius: 16,
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withOpacity(isDark ? 0.22 : 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
