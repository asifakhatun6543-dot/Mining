import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../domain/entities/history_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_file_card.dart';

/// OpenPDF Studio - Persistent Local Document History Screen
class HistoryScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HistoryScreen({super.key, required this.onNavigateTab});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _selectedFilter = 'All';

  List<HistoryEntity> _filterItems(List<HistoryEntity> allItems) {
    if (_selectedFilter == 'All') return allItems;
    final f = _selectedFilter.toLowerCase();
    return allItems.where((item) {
      if (f == 'pdf') return item.fileType == 'pdf';
      if (f == 'word') return item.fileType == 'docx' || item.fileType == 'doc';
      if (f == 'excel') return item.fileType == 'xlsx' || item.fileType == 'csv';
      if (f == 'ai') return item.fileType == 'ai';
      return true;
    }).toList();
  }

  void _showClearAllDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear History'),
        content: const Text(AppStrings.confirmClearHistory),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              HistoryService.instance.clearAll();
              Navigator.of(ctx).pop();
            },
            child: const Text('Clear All', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppStrings.historyTitle,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        AppStrings.historySubtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: _showClearAllDialog,
                    icon: const Icon(Icons.delete_sweep_rounded, size: 18, color: AppColors.error),
                    label: const Text(
                      AppStrings.clearAllHistory,
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ),

            // Horizontal Filter Chips
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: ['All', 'PDF', 'Word', 'Excel', 'AI'].map((cat) {
                  final isSel = _selectedFilter == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(cat, style: TextStyle(fontSize: 12, color: isSel ? Colors.white : null)),
                      selected: isSel,
                      selectedColor: isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed,
                      onSelected: (_) => setState(() => _selectedFilter = cat),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 12),

            // History List Stream
            Expanded(
              child: ListenableBuilder(
                listenable: HistoryService.instance,
                builder: (context, _) {
                  final items = _filterItems(HistoryService.instance.items);

                  if (items.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40),
                        child: GlassContainer(
                          padding: const EdgeInsets.all(28),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.history_toggle_off_rounded, size: 48, color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6)),
                              const SizedBox(height: 14),
                              Text(
                                AppStrings.noRecentDocs,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                AppStrings.noRecentDocsDesc,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 18),
                              ElevatedButton(
                                onPressed: () => widget.onNavigateTab(1), // Go to All Tools
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.brandRed,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                ),
                                child: const Text('Explore 23 Tools', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                    itemCount: items.length,
                    itemBuilder: (context, index) {
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
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
