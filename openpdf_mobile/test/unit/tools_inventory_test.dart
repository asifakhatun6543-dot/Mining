import 'package:flutter_test/flutter_test.dart';
import 'package:openpdf_studio/data/datasources/tools_data.dart';
import 'package:openpdf_studio/domain/entities/tool_entity.dart';

void main() {
  group('Tools Inventory Audit Tests', () {
    test('Catalog contains exactly 23 tools', () {
      expect(ToolsData.allTools.length, 23);
    });

    test('All tools have unique non-empty IDs and titles', () {
      final ids = <String>{};
      for (final tool in ToolsData.allTools) {
        expect(tool.id.isNotEmpty, true);
        expect(tool.title.isNotEmpty, true);
        expect(tool.description.isNotEmpty, true);
        expect(tool.keywords.isNotEmpty, true);
        expect(ids.contains(tool.id), false, reason: 'Duplicate ID: ${tool.id}');
        ids.add(tool.id);
      }
    });

    test('All categories are properly populated', () {
      final categories = ToolsData.allTools.map((t) => t.category).toSet();
      expect(categories.contains(ToolCategory.edit), true);
      expect(categories.contains(ToolCategory.optimize), true);
      expect(categories.contains(ToolCategory.convertFrom), true);
      expect(categories.contains(ToolCategory.convertTo), true);
      expect(categories.contains(ToolCategory.organize), true);
      expect(categories.contains(ToolCategory.ai), true);
      expect(categories.contains(ToolCategory.security), true);
    });
  });
}
