import 'package:flutter_test/flutter_test.dart';
import 'package:openpdf_studio/domain/entities/history_entity.dart';

void main() {
  group('History Entity & Serialization Tests', () {
    test('toJson and fromJson correctly preserve data', () {
      final now = DateTime.now();
      final entity = HistoryEntity(
        id: 'doc_123',
        fileName: 'Contract.pdf',
        filePath: '/storage/Contract.pdf',
        toolUsed: 'PDF Editor',
        fileType: 'pdf',
        sizeFormatted: '1.4 MB',
        timestamp: now,
      );

      final json = entity.toJson();
      final restored = HistoryEntity.fromJson(json);

      expect(restored.id, entity.id);
      expect(restored.fileName, entity.fileName);
      expect(restored.filePath, entity.filePath);
      expect(restored.toolUsed, entity.toolUsed);
      expect(restored.fileType, entity.fileType);
      expect(restored.sizeFormatted, entity.sizeFormatted);
      expect(restored.timestamp.millisecondsSinceEpoch, entity.timestamp.millisecondsSinceEpoch);
    });

    test('relativeTime computes human-readable duration', () {
      final nowEntity = HistoryEntity(
        id: '1',
        fileName: 'Now.pdf',
        toolUsed: 'Merge',
        fileType: 'pdf',
        sizeFormatted: '500 KB',
        timestamp: DateTime.now(),
      );
      expect(nowEntity.relativeTime, 'Just now');

      final pastEntity = HistoryEntity(
        id: '2',
        fileName: 'Old.pdf',
        toolUsed: 'Split',
        fileType: 'pdf',
        sizeFormatted: '1 MB',
        timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
      );
      expect(pastEntity.relativeTime, '15m ago');
    });
  });
}
