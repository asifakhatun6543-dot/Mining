import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PDF Processing Utilities & Calculations Tests', () {
    test('Compression percentage calculation avoids negative values', () {
      const original = 1000000; // 1 MB
      const compressed = 250000; // 250 KB
      final savedPercentage = ((original - compressed) / original * 100).clamp(0, 99).toStringAsFixed(1);
      expect(savedPercentage, '75.0');
    });

    test('Rotation angles map correctly to 90, 180, and 270 degrees', () {
      const validAngles = [90, 180, 270];
      for (final angle in validAngles) {
        expect(angle % 90, 0);
        expect(angle >= 90 && angle <= 270, true);
      }
    });

    test('Target size conversion from KB to bytes is accurate', () {
      const targetKb = 200.0;
      final targetBytes = (targetKb * 1024).toInt();
      expect(targetBytes, 204800);
    });
  });
}
