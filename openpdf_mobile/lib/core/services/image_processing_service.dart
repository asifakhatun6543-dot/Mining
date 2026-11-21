import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'file_service.dart';
import 'history_service.dart';

/// OpenPDF Studio - Pure Dart Image Processing & Scanner Simulation Engine
class ImageProcessingService {
  ImageProcessingService._();
  static final ImageProcessingService instance = ImageProcessingService._();

  /// 1. JPG TO PDF: Converts multiple images into high-resolution paginated PDF
  Future<File> imagesToPdf({
    required List<File> imageFiles,
    String outputFileName = 'converted_images.pdf',
    bool fitToPage = true,
  }) async {
    final document = PdfDocument();

    try {
      for (final imgFile in imageFiles) {
        final bytes = await imgFile.readAsBytes();
        final pdfImage = PdfBitmap(bytes);
        final page = document.pages.add();

        if (fitToPage) {
          final pageSize = page.getClientSize();
          page.graphics.drawImage(
            pdfImage,
            Rect.fromLTWH(0, 0, pageSize.width, pageSize.height),
          );
        } else {
          page.graphics.drawImage(
            pdfImage,
            Rect.fromLTWH(0, 0, pdfImage.width.toDouble(), pdfImage.height.toDouble()),
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
        toolUsed: 'JPG to PDF',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputBytes.length),
      );

      return outFile;
    } finally {
      document.dispose();
    }
  }

  /// 2. RESIZE & COMPRESS IMAGE: Adjusts pixel dimensions, format & quality
  Future<File> resizeAndCompressImage({
    required File imageFile,
    int? targetWidth,
    int? targetHeight,
    int quality = 80,
    String format = 'jpg',
    String outputFileName = 'resized_image.jpg',
  }) async {
    final bytes = await imageFile.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) throw Exception('Unsupported image format');

    // Resize while maintaining aspect ratio
    final resized = img.copyResize(
      decoded,
      width: targetWidth,
      height: targetHeight,
      interpolation: img.Interpolation.linear,
    );

    Uint8List outputBytes;
    if (format.toLowerCase() == 'png') {
      outputBytes = Uint8List.fromList(img.encodePng(resized));
    } else {
      outputBytes = Uint8List.fromList(img.encodeJpg(resized, quality: quality));
    }

    final outFile = await FileService.instance.saveFile(
      fileName: outputFileName,
      bytes: outputBytes,
    );

    await HistoryService.instance.addRecord(
      fileName: outputFileName,
      filePath: outFile.path,
      toolUsed: 'Resize & Compress Image',
      fileType: format,
      sizeFormatted: _formatBytes(outputBytes.length),
    );

    return outFile;
  }

  /// 3. PDF CONVERT TO SCANNER: Authentic physical photocopy effect with contrast, grain & tilt
  Future<File> convertToPhotocopyScanner({
    required File imageOrPdfPage,
    double contrast = 1.35,
    bool addGrain = true,
    bool applyTilt = true,
    String outputFileName = 'scanned_copy.pdf',
  }) async {
    final bytes = await imageOrPdfPage.readAsBytes();
    var decoded = img.decodeImage(bytes);
    if (decoded == null) throw Exception('Could not decode input page image');

    // 1. Grayscale photocopy conversion
    decoded = img.grayscale(decoded);

    // 2. High-contrast thresholding
    decoded = img.adjustColor(decoded, contrast: contrast);

    // 3. Inject realistic film grain noise
    if (addGrain) {
      final random = Random();
      for (int y = 0; y < decoded.height; y++) {
        for (int x = 0; x < decoded.width; x++) {
          if (random.nextDouble() < 0.04) {
            final pixel = decoded.getPixel(x, y);
            final noise = (random.nextInt(30) - 15);
            final val = (pixel.r.toInt() + noise).clamp(0, 255);
            decoded.setPixelRgb(x, y, val, val, val);
          }
        }
      }
    }

    // 4. Slight physical scanner skew/tilt (0.8°)
    if (applyTilt) {
      decoded = img.copyRotate(decoded, angle: 0.8, interpolation: img.Interpolation.linear);
    }

    // Encode to high-res JPEG
    final processedBytes = Uint8List.fromList(img.encodeJpg(decoded, quality: 85));

    // Place into a single-page clean scanned PDF
    final document = PdfDocument();
    try {
      final page = document.pages.add();
      final pdfBitmap = PdfBitmap(processedBytes);
      final clientSize = page.getClientSize();

      page.graphics.drawImage(
        pdfBitmap,
        Rect.fromLTWH(0, 0, clientSize.width, clientSize.height),
      );

      final outputPdfBytes = Uint8List.fromList(document.saveSync());
      final outFile = await FileService.instance.saveFile(
        fileName: outputFileName,
        bytes: outputPdfBytes,
      );

      await HistoryService.instance.addRecord(
        fileName: outputFileName,
        filePath: outFile.path,
        toolUsed: 'PDF Convert to Scanner',
        fileType: 'pdf',
        sizeFormatted: _formatBytes(outputPdfBytes.length),
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
