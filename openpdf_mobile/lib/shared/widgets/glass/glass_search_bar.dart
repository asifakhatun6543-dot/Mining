import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'glass_container.dart';

/// OpenPDF Studio - Executive Liquid Glass Search Bar
class GlassSearchBar extends StatefulWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onFilterTap;
  final String hintText;

  const GlassSearchBar({
    super.key,
    this.controller,
    this.onChanged,
    this.onFilterTap,
    this.hintText = 'Search 23 tools, categories, docs...',
  });

  @override
  State<GlassSearchBar> createState() => _GlassSearchBarState();
}

class _GlassSearchBarState extends State<GlassSearchBar> {
  late TextEditingController _controller;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _controller.addListener(_updateTextState);
  }

  void _updateTextState() {
    final has = _controller.text.isNotEmpty;
    if (has != _hasText) {
      setState(() => _hasText = has);
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    } else {
      _controller.removeListener(_updateTextState);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassContainer(
      height: 54,
      borderRadius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          Icon(
            Icons.search_rounded,
            size: 22,
            color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _controller,
              onChanged: widget.onChanged,
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkPrimaryText : AppColors.lightPrimaryText,
              ),
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: (isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText).withOpacity(0.8),
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          if (_hasText)
            GestureDetector(
              onTap: () {
                _controller.clear();
                widget.onChanged?.call('');
              },
              child: Padding(
                padding: const EdgeInsets.all(4.0),
                child: Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: isDark ? AppColors.darkSecondaryText : AppColors.lightSecondaryText,
                ),
              ),
            ),
          if (widget.onFilterTap != null) ...[
            Container(
              height: 20,
              width: 1,
              margin: const EdgeInsets.symmetric(horizontal: 8),
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
            GestureDetector(
              onTap: widget.onFilterTap,
              child: Icon(
                Icons.tune_rounded,
                size: 20,
                color: isDark ? AppColors.darkPrimaryAccent : AppColors.lightPrimaryAccent,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
