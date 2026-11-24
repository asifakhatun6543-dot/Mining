import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:openpdf_studio/core/services/file_export_service.dart';

void main() {
  group('FileExportService MIME Type Resolution', () {
    test('resolves correct MIME types for standard document formats', () {
      expect(FileExportService.getMimeType('document.pdf'), equals('application/pdf'));
      expect(FileExportService.getMimeType('DOCUMENT.PDF'), equals('application/pdf'));
      expect(FileExportService.getMimeType('report.docx'), equals('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
      expect(FileExportService.getMimeType('data.xlsx'), equals('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
      expect(FileExportService.getMimeType('slides.pptx'), equals('application/vnd.openxmlformats-officedocument.presentationml.presentation'));
      expect(FileExportService.getMimeType('summary.doc'), equals('application/msword'));
      expect(FileExportService.getMimeType('table.xls'), equals('application/vnd.ms-excel'));
      expect(FileExportService.getMimeType('deck.ppt'), equals('application/vnd.ms-powerpoint'));
    });

    test('resolves correct MIME types for images, text and archives', () {
      expect(FileExportService.getMimeType('photo.jpg'), equals('image/jpeg'));
      expect(FileExportService.getMimeType('photo.jpeg'), equals('image/jpeg'));
      expect(FileExportService.getMimeType('graphic.png'), equals('image/png'));
      expect(FileExportService.getMimeType('asset.webp'), equals('image/webp'));
      expect(FileExportService.getMimeType('log.txt'), equals('text/plain'));
      expect(FileExportService.getMimeType('records.csv'), equals('text/csv'));
      expect(FileExportService.getMimeType('bundle.zip'), equals('application/zip'));
      expect(FileExportService.getMimeType('unknown.custom_ext'), equals('application/octet-stream'));
    });
  });

  group('FileExportService Byte Formatting', () {
    test('formats bytes to human readable sizes correctly', () {
      expect(FileExportService.formatBytes(0), equals('0 B'));
      expect(FileExportService.formatBytes(512), equals('512 B'));
      expect(FileExportService.formatBytes(1024), equals('1 KB'));
      expect(FileExportService.formatBytes(1536), equals('1.5 KB'));
      expect(FileExportService.formatBytes(1048576), equals('1 MB'));
      expect(FileExportService.formatBytes(2621440), equals('2.5 MB'));
      expect(FileExportService.formatBytes(1073741824), equals('1 GB'));
    });
  });

  group('FileExportService Magic Byte Validation', () {
    test('validates authentic PDF header bytes', () {
      final validPdfBytes = Uint8List.fromList([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]); // %PDF-1.5
      expect(FileExportService.validateBytes(validPdfBytes, 'test.pdf'), isTrue);

      final invalidPdfBytes = Uint8List.fromList([0x00, 0x01, 0x02, 0x03]);
      expect(FileExportService.validateBytes(invalidPdfBytes, 'test.pdf'), isFalse);
    });

    test('validates authentic PNG image header bytes', () {
      final validPng = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(FileExportService.validateBytes(validPng, 'image.png'), isTrue);

      final invalidPng = Uint8List.fromList([0x89, 0x00, 0x00, 0x00]);
      expect(FileExportService.validateBytes(invalidPng, 'image.png'), isFalse);
    });

    test('validates authentic JPEG image header bytes', () {
      final validJpg = Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0]);
      expect(FileExportService.validateBytes(validJpg, 'image.jpg'), isTrue);
    });

    test('validates authentic ZIP / Office PK header bytes', () {
      final validZip = Uint8List.fromList([0x50, 0x4B, 0x03, 0x04]);
      expect(FileExportService.validateBytes(validZip, 'document.docx'), isTrue);
      expect(FileExportService.validateBytes(validZip, 'sheet.xlsx'), isTrue);
      expect(FileExportService.validateBytes(validZip, 'archive.zip'), isTrue);
    });

    test('rejects empty byte arrays', () {
      expect(FileExportService.validateBytes(Uint8List(0), 'empty.pdf'), isFalse);
    });
  });

  group('FileExportService Duplicate Filename Resolution', () {
    test('returns original name when no collision', () {
      final unique = FileExportService.resolveUniqueFileName('document.pdf', existingNames: ['other.pdf']);
      expect(unique, equals('document.pdf'));
    });

    test('increments suffix when filename already exists', () {
      final unique1 = FileExportService.resolveUniqueFileName('document.pdf', existingNames: ['document.pdf']);
      expect(unique1, equals('document (1).pdf'));

      final unique2 = FileExportService.resolveUniqueFileName('document.pdf', existingNames: [
        'document.pdf',
        'document (1).pdf',
      ]);
      expect(unique2, equals('document (2).pdf'));
    });
  });

  group('FileExportResult Model Verification', () {
    test('contains accurate metadata', () {
      const result = FileExportResult(
        success: true,
        fileName: 'Invoice.pdf',
        displayPath: 'Download/PDF WITH LOVE/Invoice.pdf',
        localFilePath: '/data/user/0/com.openpdf.studio/app_flutter/Invoice.pdf',
        contentUri: 'content://media/external/downloads/42',
        bytesWritten: 1048576,
        sizeFormatted: '1 MB',
        mimeType: 'application/pdf',
      );

      expect(result.success, isTrue);
      expect(result.fileName, equals('Invoice.pdf'));
      expect(result.displayPath, equals('Download/PDF WITH LOVE/Invoice.pdf'));
      expect(result.primaryPath, equals('/data/user/0/com.openpdf.studio/app_flutter/Invoice.pdf'));
      expect(result.sizeFormatted, equals('1 MB'));
      expect(result.mimeType, equals('application/pdf'));
    });
  });
}
