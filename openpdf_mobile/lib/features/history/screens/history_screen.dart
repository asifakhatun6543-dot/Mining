import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/services/file_service.dart';
import '../../../core/services/history_service.dart';
import '../../../domain/entities/history_entity.dart';
import '../../../shared/widgets/glass/glass_container.dart';
import '../../../shared/widgets/glass/glass_file_card.dart';

/// PDF WITH LOVE - Full Document History & File Manager Screen
class HistoryScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;
  final bool isSubpage;

  const HistoryScreen({
    super.key,
    this.onNavigateTab,
    this.isSubpage = false,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _selectedFilter = 'All';
  String _searchQuery = '';
  String _sortBy = 'Newest';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<HistoryEntity> _filterAndSortItems(List<HistoryEntity> allItems) {
    var items = List<HistoryEntity>.from(allItems);

    // 1. Text Search Filter
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      items = items.where((i) => i.fileName.toLowerCase().contains(q)).toList();
    }

    // 2. Category Filter Tab
    if (_selectedFilter != 'All') {
      final f = _selectedFilter.toLowerCase();
      items = items.where((item) {
        final t = item.fileType.toLowerCase();
        if (f == 'pdf') return t == 'pdf';
        if (f == 'docx') return t == 'docx' || t == 'doc';
        if (f == 'xlsx') return t == 'xlsx' || t == 'csv';
        if (f == 'pptx') return t == 'pptx' || t == 'ppt';
        if (f == 'images') {
          return t == 'jpg' || t == 'png' || t == 'jpeg' || t == 'webp' || t == 'image';
        }
        if (f == 'other') {
          return t != 'pdf' &&
              t != 'docx' &&
              t != 'doc' &&
              t != 'xlsx' &&
              t != 'pptx' &&
              !t.contains('image');
        }
        return true;
      }).toList();
    }

    // 3. Sorting
    switch (_sortBy) {
      case 'Oldest':
        items.sort((a, b) => a.timestamp.compareTo(b.timestamp));
        break;
      case 'Name (A-Z)':
        items.sort((a, b) => a.fileName.toLowerCase().compareTo(b.fileName.toLowerCase()));
        break;
      case 'Newest':
      default:
        items.sort((a, b) => b.timestamp.compareTo(a.timestamp));
        break;
    }

    return items;
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
    final primaryAccent = isDark ? const Color(0xFFFF2A55) : AppColors.brandRed;
    final canGoBack = widget.isSubpage || Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Top App Bar Header
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 18, 8),
              child: Row(
                children: [
                  if (canGoBack)
                    IconButton(
                      icon: Icon(
                        Icons.arrow_back_rounded,
                        color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                      tooltip: 'Back',
                    ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Document History',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'All processed & exported files on your device',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _showClearAllDialog,
                    icon: const Icon(Icons.delete_sweep_rounded, size: 18, color: AppColors.error),
                    label: const Text(
                      'Clear',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ),

            // Search Bar & Sort Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 42,
                      decoration: BoxDecoration(
                        color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Row(
                        children: [
                          Icon(Icons.search_rounded,
                              size: 18,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search documents...',
                                hintStyle: TextStyle(
                                  fontSize: 13,
                                  color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText)
                                      .withOpacity(0.6),
                                ),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                              onChanged: (val) => setState(() => _searchQuery = val),
                            ),
                          ),
                          if (_searchQuery.isNotEmpty)
                            InkWell(
                              onTap: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                              child: const Icon(Icons.close_rounded, size: 16),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PopupMenuButton<String>(
                    initialValue: _sortBy,
                    tooltip: 'Sort Documents',
                    onSelected: (val) => setState(() => _sortBy = val),
                    itemBuilder: (ctx) => [
                      const PopupMenuItem(value: 'Newest', child: Text('Newest First')),
                      const PopupMenuItem(value: 'Oldest', child: Text('Oldest First')),
                      const PopupMenuItem(value: 'Name (A-Z)', child: Text('Name (A-Z)')),
                    ],
                    child: Container(
                      height: 42,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: (isDark ? Colors.white : Colors.black).withOpacity(0.08),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.sort_rounded, size: 18, color: primaryAccent),
                          const SizedBox(width: 4),
                          Text(
                            _sortBy,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Horizontal Filter Tabs: All, PDF, DOCX, XLSX, PPTX, Images, Other
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 18),
                children: ['All', 'PDF', 'DOCX', 'XLSX', 'PPTX', 'Images', 'Other'].map((cat) {
                  final isSel = _selectedFilter == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                          color: isSel ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                        ),
                      ),
                      selected: isSel,
                      selectedColor: primaryAccent,
                      backgroundColor: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
                      side: BorderSide(
                        color: isSel ? primaryAccent : (isDark ? Colors.white12 : Colors.black12),
                      ),
                      onSelected: (_) => setState(() => _selectedFilter = cat),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 8),

            // Documents List Stream
            Expanded(
              child: ListenableBuilder(
                listenable: HistoryService.instance,
                builder: (context, _) {
                  final items = _filterAndSortItems(HistoryService.instance.items);

                  if (items.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40),
                        child: GlassContainer(
                          padding: const EdgeInsets.all(28),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.history_toggle_off_rounded,
                                  size: 48,
                                  color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText)
                                      .withOpacity(0.6)),
                              const SizedBox(height: 14),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'No matches found'
                                    : 'No documents in this filter',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'Try adjusting your search terms'
                                    : 'Process a document or select another category',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (widget.onNavigateTab != null) ...[
                                const SizedBox(height: 18),
                                ElevatedButton(
                                  onPressed: () => widget.onNavigateTab!(1),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: primaryAccent,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                  ),
                                  child: const Text('Explore Tools',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 4, 18, 110),
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final fileExists = item.filePath != null && File(item.filePath!).existsSync();

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GlassFileCard(
                              item: item,
                              onTap: () {
                                if (item.filePath != null && fileExists) {
                                  FileService.instance.shareFile(item.filePath!);
                                }
                              },
                              onShare: (item.filePath != null && fileExists)
                                  ? () => FileService.instance.shareFile(item.filePath!)
                                  : null,
                              onDelete: () => HistoryService.instance.removeRecord(item.id),
                            ),
                            if (!fileExists && item.filePath != null)
                              Padding(
                                padding: const EdgeInsets.only(left: 14, top: 2),
                                child: Text(
                                  '⚠️ File moved or removed from storage',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.amber.shade700,
                                  ),
                                ),
                              ),
                          ],
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
