import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../data/datasources/tools_data.dart';
import '../../../domain/entities/tool_entity.dart';
import '../../../shared/widgets/glass/glass_search_bar.dart';
import '../../../shared/widgets/glass/glass_tool_card.dart';
import '../../tools/screens/tool_workspace_screen.dart';
import '../../tools/screens/pdf_editor_webview_screen.dart';

/// OpenPDF Studio - Complete 23 Tools Directory Screen
class AllToolsScreen extends StatefulWidget {
  const AllToolsScreen({super.key});

  @override
  State<AllToolsScreen> createState() => _AllToolsScreenState();
}

class _AllToolsScreenState extends State<AllToolsScreen> {
  ToolCategory _selectedCategory = ToolCategory.all;
  String _searchQuery = '';

  List<ToolEntity> get _filteredTools {
    return ToolsData.allTools.where((tool) {
      final matchesCategory = _selectedCategory == ToolCategory.all || tool.category == _selectedCategory;
      if (!matchesCategory) return false;

      if (_searchQuery.trim().isEmpty) return true;
      final query = _searchQuery.toLowerCase();
      final inTitle = tool.title.toLowerCase().contains(query);
      final inDesc = tool.description.toLowerCase().contains(query);
      final inKeywords = tool.keywords.any((k) => k.toLowerCase().contains(query));

      return inTitle || inDesc || inKeywords;
    }).toList();
  }

  void _openTool(ToolEntity tool) {
    if (tool.id == 'edit-pdf') {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const PdfEditorWebViewScreen(pdfFile: null)),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ToolWorkspaceScreen(tool: tool)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tools = _filteredTools;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header & Title
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppStrings.tabAllTools,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '23 Powerful Document & PDF Utilities',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0x22FFFFFF) : const Color(0x150F172A),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${tools.length} Tools',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GlassSearchBar(
                hintText: 'Search by name, format, or keyword...',
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
            ),

            const SizedBox(height: 12),

            // Horizontal Category Filter Pills
            SizedBox(
              height: 38,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildCategoryPill(ToolCategory.all, 'All (23)'),
                  _buildCategoryPill(ToolCategory.ai, 'AI & Smart'),
                  _buildCategoryPill(ToolCategory.convertFrom, 'Convert from PDF'),
                  _buildCategoryPill(ToolCategory.convertTo, 'Convert to PDF'),
                  _buildCategoryPill(ToolCategory.optimize, 'Optimize & Scan'),
                  _buildCategoryPill(ToolCategory.edit, 'Edit & Sign'),
                  _buildCategoryPill(ToolCategory.organize, 'Organize'),
                  _buildCategoryPill(ToolCategory.security, 'Security'),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2-Column Tools Grid
            Expanded(
              child: tools.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off_rounded, size: 48, color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.6)),
                          const SizedBox(height: 12),
                          Text(
                            'No matching tools found',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Try a different keyword or category filter',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                            ),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.95,
                      ),
                      itemCount: tools.length,
                      itemBuilder: (context, index) {
                        final tool = tools[index];
                        return GlassToolCard(
                          tool: tool,
                          onTap: () => _openTool(tool),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryPill(ToolCategory category, String label) {
    final isSelected = _selectedCategory == category;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _selectedCategory = category),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppColors.darkPrimaryAccent : AppColors.brandRed)
                : (isDark ? const Color(0x1AFFFFFF) : const Color(0x0F0F172A)),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? Colors.transparent
                  : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
              width: 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected
                  ? Colors.white
                  : (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText),
            ),
          ),
        ),
      ),
    );
  }
}
