import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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

/// OpenPDF Studio - Executive Mobile Home Dashboard
/// Styled to match the dark Liquid Glass visual aesthetic (Image 2 reference):
/// - Top Status Bar with pill badge & avatar
/// - Dynamic real-time date + Hero gradient headline ("Your Documents, Mastered Today")
/// - Glowing "Your AI Assistant" card with action pill
/// - "Today's Activity / Progress" neon capsule card
/// - Quick Actions & Popular Tools with top-right diagonal arrows (↗)
/// - Recent Documents list
class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  void _openTool(ToolEntity tool) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ToolWorkspaceScreen(tool: tool)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final popularTools = ToolsData.allTools.where((t) => t.isPopular).take(6).toList();
    final todayFormatted = DateFormat('EEEE, d MMM yyyy').format(DateTime.now());

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // -----------------------------------------------------------------
            // 1. Top Bar: App Pill Badge, Notifications, Profile Avatar (Image 2)
            // -----------------------------------------------------------------
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Left: Logo & Active Tools Badge
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.brandRed, Color(0xFFF43F5E)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(color: AppColors.brandRed.withOpacity(0.35), blurRadius: 10, offset: const Offset(0, 3)),
                            ],
                          ),
                          child: const Center(
                            child: Text('P', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0x1FFFFFFF) : const Color(0x0F000000),
                            borderRadius: BorderRadius.circular(9999),
                            border: Border.all(
                              color: isDark ? const Color(0x2EFFFFFF) : const Color(0x18000000),
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.bolt_rounded, size: 14, color: isDark ? const Color(0xFFD4FF32) : AppColors.brandRed),
                              const SizedBox(width: 4),
                              Text(
                                '23 Tools Ready',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Right: Notification Bell & Settings Avatar
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.notifications_none_rounded, size: 22),
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('All document engines operating locally and offline ✓')),
                            );
                          },
                        ),
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const SettingsScreen()),
                            );
                          },
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                              ),
                              border: Border.all(color: Colors.white, width: 1.5),
                            ),
                            child: const Icon(Icons.person_rounded, size: 20, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // -----------------------------------------------------------------
            // 2. Hero Headline: "Your Documents, Mastered Today" (Image 2 style)
            // -----------------------------------------------------------------
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      todayFormatted,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your Documents,',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                        letterSpacing: -0.6,
                        height: 1.15,
                      ),
                    ),
                    ShaderMask(
                      shaderCallback: (bounds) => LinearGradient(
                        colors: isDark
                            ? [const Color(0xFFD4FF32), const Color(0xFF38BDF8)]
                            : [AppColors.brandRed, const Color(0xFFF43F5E)],
                      ).createShader(bounds),
                      child: const Text(
                        'Mastered Today',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.6,
                          height: 1.15,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // -----------------------------------------------------------------
            // 3. "Your AI Assistant" Hero Card (Exact Image 2 layout)
            // -----------------------------------------------------------------
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassCard(
                  onTap: () => widget.onNavigateTab(2), // Switch to Chat AI
                  gradient: LinearGradient(
                    colors: isDark
                        ? [
                            const Color(0xFF1E2B1E),
                            const Color(0xFF111E2E),
                          ]
                        : [
                            const Color(0xFFEFFDF5),
                            const Color(0xFFEFF6FF),
                          ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderColor: isDark ? const Color(0x40D4FF32) : const Color(0x3310B981),
                  padding: const EdgeInsets.all(20),
                  child: Stack(
                    children: [
                      // Glowing Ambient Orb on right side
                      Positioned(
                        right: -10,
                        top: 0,
                        bottom: 0,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                (isDark ? const Color(0xFFD4FF32) : const Color(0xFF10B981)).withOpacity(0.35),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          child: Icon(
                            Icons.auto_awesome_rounded,
                            size: 42,
                            color: isDark ? const Color(0xFFD4FF32) : const Color(0xFF10B981),
                          ),
                        ),
                      ),

                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Your AI Assistant',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (isDark ? const Color(0xFFD4FF32) : const Color(0xFF10B981)).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Private',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? const Color(0xFFD4FF32) : const Color(0xFF10B981),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: 220,
                            child: Text(
                              'Summarize, translate, and extract insights from documents instantly.',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                height: 1.35,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Glowing Action Pill Button
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: isDark
                                    ? [const Color(0xFFD4FF32), const Color(0xFFA3E635)]
                                    : [AppColors.brandRed, const Color(0xFFF43F5E)],
                              ),
                              borderRadius: BorderRadius.circular(9999),
                              boxShadow: [
                                BoxShadow(
                                  color: (isDark ? const Color(0xFFD4FF32) : AppColors.brandRed).withOpacity(0.35),
                                  blurRadius: 14,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Ask AI anything',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? const Color(0xFF0F172A) : Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Icon(
                                  Icons.north_east_rounded,
                                  size: 14,
                                  color: isDark ? const Color(0xFF0F172A) : Colors.white,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // -----------------------------------------------------------------
            // 4. "Today's Activity / Progress" Card (Image 2 style)
            // -----------------------------------------------------------------
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: GlassContainer(
                  padding: const EdgeInsets.all(16),
                  borderRadius: 18,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Today's Activity",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0x1FFFFFFF) : const Color(0x0F000000),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Offline & Local',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isDark ? const Color(0xFFD4FF32) : AppColors.success,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '100% Privacy Preserved',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                          Text(
                            '0 KB Telemetry',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Neon Green Glowing Progress Capsule
                      ClipRRect(
                        borderRadius: BorderRadius.circular(9999),
                        child: Container(
                          height: 8,
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: 0.88,
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: isDark
                                      ? [const Color(0xFFD4FF32), const Color(0xFF10B981)]
                                      : [AppColors.brandRed, const Color(0xFFF59E0B)],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // -----------------------------------------------------------------
            // 5. Executive Smart Search Bar
            // -----------------------------------------------------------------
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
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

            // -----------------------------------------------------------------
            // 6. Quick Action Tiles with Diagonal Arrows (↗)
            // -----------------------------------------------------------------
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

            // -----------------------------------------------------------------
            // 7. Popular Tools Header & Grid
            // -----------------------------------------------------------------
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
                      child: Text(
                        AppStrings.viewAll,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFFD4FF32) : AppColors.brandRed,
                        ),
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

            // -----------------------------------------------------------------
            // 8. Recent Documents Section
            // -----------------------------------------------------------------
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
                      child: Text(
                        AppStrings.viewAll,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFFD4FF32) : AppColors.brandRed,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Listenable History Section
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

            // Footer Company Branding Badge: [ Built by RS7 Private Limited ]
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 110),
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
                        Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: isDark ? const Color(0xFFD4FF32) : AppColors.brandRed,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'OpenPDF Studio • Built by RS7 Private Limited',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.85),
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

  Widget _buildQuickActionTile(String label, IconData icon, Color color, String toolId) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tool = ToolsData.allTools.firstWhere((t) => t.id == toolId, orElse: () => ToolsData.allTools.first);

    return Expanded(
      child: GlassCard(
        onTap: () => _openTool(tool),
        borderRadius: 16,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SizedBox(width: 14),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color.withOpacity(isDark ? 0.22 : 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                Icon(
                  Icons.north_east_rounded,
                  size: 14,
                  color: (isDark ? Colors.white38 : Colors.black26),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
