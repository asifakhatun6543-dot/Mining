import 'package:flutter_test/flutter_test.dart';
import 'package:openpdf_studio/core/services/document_ai_service.dart';

void main() {
  group('Document AI Service Tests', () {
    const sampleText = '''
ACME Annual Fiscal Report 2026.
Revenue for Q1 was \$4,500,000, representing an increase of 14.5% compared to Jan 15, 2025.
All employees must submit the audit compliance review by 12/31/2026.
The executive team will deploy new automated systems to streamline operations.
''';

    test('generate3BulletSummary returns formatted bullet points', () {
      final summary = DocumentAiService.instance.generate3BulletSummary(sampleText);
      expect(summary.contains('•'), true);
      expect(summary.isNotEmpty, true);
    });

    test('extractDatesAndNumbers detects fiscal numbers and deadlines', () {
      final matches = DocumentAiService.instance.extractDatesAndNumbers(sampleText);
      expect(matches.contains('2026'), true);
      expect(matches.any((m) => m.contains('4,500,000') || m.contains('14.5%')), true);
      expect(matches.any((m) => m.contains('12/31/2026') || m.contains('Jan 15, 2025')), true);
    });

    test('extractActionItems extracts sentences with directive verbs', () {
      final actions = DocumentAiService.instance.extractActionItems(sampleText);
      expect(actions.isNotEmpty, true);
      expect(actions.any((a) => a.contains('must submit')), true);
    });

    test('draftEmailSummary constructs professional email format', () {
      final email = DocumentAiService.instance.draftEmailSummary('Report.pdf', sampleText);
      expect(email.contains('Subject:'), true);
      expect(email.contains('Report.pdf'), true);
    });
  });
}
