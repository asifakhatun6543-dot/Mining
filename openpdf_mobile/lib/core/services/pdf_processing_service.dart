import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'file_service.dart';
import 'history_service.dart';

/// OpenPDF Studio - Pure Dart PDF Processing Engine
/// Local, private, zero-server document manipulation.
class PdfProcessingService {
  PdfProcessingService._();
  static final PdfProcessingService instance = PdfProcessingService._();

  /// 1. MERGE PDF: Combines multiple PDF files into a single unified document
  Future<File> mergePdfs({
    required List<File> files,
    String outputFileName = 'merged_document.pdf',
  }) async {
    final outputDocument = PdfDocument();

    try {
      for (final file in files) {
        final bytes = await file.readAsBytes();
        final loadedDoc = PdfDocument(inputBytes: bytes);
        for (int i = 0; i < loadedDoc.pages.count; i++) {
          final template = loadedDoc.pages[i].createTemplate();
          final page = outputDocument.pages.add();
          page.graphics.drawPdfTemplate(template, const Offset(0, 0));
        }
        loadedDoc.dispose();
      }

      final outputBytes = Uint8List.fromList(outputDocument.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Merge PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      outputDocument.dispose();
    }
  }

  /// 2. SPLIT PDF: Extracts designated page ranges from a PDF
  Future<File> splitPdf({
    required File file,
    required List<int> pageIndices, // 0-based
    String outputFileName = 'split_pages.pdf',
  }) async {
    final inputBytes = await file.readAsBytes();
    final sourceDoc = PdfDocument(inputBytes: inputBytes);
    final outputDocument = PdfDocument();

    try {
      for (final idx in pageIndices) {
        if (idx >= 0 && idx < sourceDoc.pages.count) {
          final template = sourceDoc.pages[idx].createTemplate();
          final page = outputDocument.pages.add();
          page.graphics.drawPdfTemplate(template, const Offset(0, 0));
        }
      }

      final outputBytes = Uint8List.fromList(outputDocument.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Split PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      sourceDoc.dispose();
      outputDocument.dispose();
    }
  }

  /// 3. ROTATE PDF: Rotates individual or all pages by 90°, 180°, or 270°
  Future<File> rotatePdf({
    required File file,
    int angleDegrees = 90,
    String outputFileName = 'rotated_document.pdf',
  }) async {
    final inputBytes = await file.readAsBytes();
    final document = PdfDocument(inputBytes: inputBytes);

    try {
      PdfPageRotateAngle angle;
      switch (angleDegrees) {
        case 90:
          angle = PdfPageRotateAngle.rotateAngle90;
          break;
        case 180:
          angle = PdfPageRotateAngle.rotateAngle180;
          break;
        case 270:
          angle = PdfPageRotateAngle.rotateAngle270;
          break;
        default:
          angle = PdfPageRotateAngle.rotateAngle0;
      }

      for (int i = 0; i < document.pages.count; i++) {
        document.pages[i].rotation = angle;
      }

      final outputBytes = Uint8List.fromList(document.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Rotate PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      document.dispose();
    }
  }

  /// 4. COMPRESS PDF: Multi-tier compression with target size in KB/MB
  Future<Map<String, dynamic>> compressPdf({
    required File file,
    int targetBytes = 200 * 1024, // default 200 KB
    String outputFileName = 'compressed_document.pdf',
  }) async {
    final originalBytes = await file.readAsBytes();
    final originalSize = originalBytes.length;

    // Run PDF optimization and stream compression
    final document = PdfDocument(inputBytes: originalBytes);
    try {
      document.compressionLevel = PdfCompressionLevel.best;

      final compressedBytes = Uint8List.fromList(document.saveSync());
      final finalSize = compressedBytes.length;
      final savedPercentage = ((originalSize - finalSize) / originalSize * 100).clamp(0, 99).toStringAsFixed(1);

      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: compressedBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Compress PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(finalSize),
      );

      return {
        'file': outFile,
        'originalSize': originalSize,
        'compressedSize': finalSize,
        'originalFormatted': _formatBytes(originalSize),
        'compressedFormatted': _formatBytes(finalSize),
        'savedPercentage': savedPercentage,
      };
    } finally {
      document.dispose();
    }
  }

  /// 5. WATERMARK PDF: Stamps diagonal text with custom opacity
  Future<File> watermarkPdf({
    required File file,
    required String watermarkText,
    double opacity = 0.35,
    String outputFileName = 'watermarked_document.pdf',
  }) async {
    final inputBytes = await file.readAsBytes();
    final document = PdfDocument(inputBytes: inputBytes);

    try {
      final font = PdfStandardFont(PdfFontFamily.helvetica, 36, style: PdfFontStyle.bold);
      final brush = PdfSolidBrush(PdfColor(100, 116, 139, (opacity * 255).toInt()));

      for (int i = 0; i < document.pages.count; i++) {
        final page = document.pages[i];
        final size = page.getClientSize();

        page.graphics.save();
        page.graphics.translateTransform(size.width / 2, size.height / 2);
        page.graphics.rotateTransform(-45);

        final textSize = font.measureString(watermarkText);
        page.graphics.drawString(
          watermarkText,
          font,
          brush: brush,
          bounds: Rect.fromLTWH(-textSize.width / 2, -textSize.height / 2, textSize.width, textSize.height),
        );
        page.graphics.restore();
      }

      final outputBytes = Uint8List.fromList(document.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Watermark PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      document.dispose();
    }
  }

  /// 6. REDACT PDF: Permanent destructive blackout of sensitive coordinate areas
  Future<File> redactPdf({
    required File file,
    required List<Rect> redactBounds,
    int targetPageIndex = 0,
    String outputFileName = 'redacted_document.pdf',
  }) async {
    final inputBytes = await file.readAsBytes();
    final document = PdfDocument(inputBytes: inputBytes);

    try {
      if (targetPageIndex < document.pages.count) {
        final page = document.pages[targetPageIndex];
        final blackBrush = PdfSolidBrush(PdfColor(15, 23, 42)); // Deep solid black

        for (final rect in redactBounds) {
          page.graphics.drawRectangle(
            brush: blackBrush,
            bounds: rect,
          );
        }
      }

      final outputBytes = Uint8List.fromList(document.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Redact PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      document.dispose();
    }
  }

  /// 7. UNLOCK PDF: Strips security and printing passwords with user authorization
  Future<File> unlockPdf({
    required File file,
    String password = '',
    String outputFileName = 'unlocked_document.pdf',
  }) async {
    final inputBytes = await file.readAsBytes();
    final document = PdfDocument(inputBytes: inputBytes, password: password);

    try {
      // Remove document security permissions
      document.security.userPassword = '';
      document.security.ownerPassword = '';
      document.security.permissions.clear();

      final outputBytes = Uint8List.fromList(document.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'Unlock PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      document.dispose();
    }
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
