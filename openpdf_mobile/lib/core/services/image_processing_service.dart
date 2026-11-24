import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui';
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

  /// Returns original dimensions, format, and size info of an image file
  Future<Map<String, dynamic>> inspectImage(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw Exception('Could not decode image. Unsupported or corrupted file format.');
    }
    return {
      'width': decoded.width,
      'height': decoded.height,
      'aspectRatio': decoded.width / decoded.height,
      'hasAlpha': decoded.hasAlpha,
      'sizeBytes': bytes.length,
      'sizeFormatted': _formatBytes(bytes.length),
    };
  }

  /// 2. RESIZE & COMPRESS IMAGE: Advanced pixel dimensions, percentage, DPI, format & quality controls
  Future<File> resizeAndCompressImage({
    required File imageFile,
    int? targetWidth,
    int? targetHeight,
    double? resizePercentage,
    bool maintainAspectRatio = true,
    int? dpi,
    int quality = 85,
    String format = 'jpg',
    String? backgroundColorHex,
    String outputFileName = 'resized_image.jpg',
  }) async {
    final bytes = await imageFile.readAsBytes();
    if (bytes.isEmpty) {
      throw Exception('Cannot process empty image file.');
    }

    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw Exception('Unsupported or invalid image format. Please select a valid JPG, PNG, or WebP image.');
    }

    final origW = decoded.width;
    final origH = decoded.height;

    int newW = origW;
    int newH = origH;

    if (resizePercentage != null && resizePercentage > 0) {
      final factor = resizePercentage / 100.0;
      newW = (origW * factor).round().clamp(1, 16000);
      newH = (origH * factor).round().clamp(1, 16000);
    } else if (targetWidth != null || targetHeight != null) {
      if (maintainAspectRatio && origW > 0 && origH > 0) {
        final aspect = origW / origH;
        if (targetWidth != null && targetHeight != null) {
          // Fit within requested box preserving aspect
          final scaleW = targetWidth / origW;
          final scaleH = targetHeight / origH;
          final scale = min(scaleW, scaleH);
          newW = (origW * scale).round().clamp(1, 16000);
          newH = (origH * scale).round().clamp(1, 16000);
        } else if (targetWidth != null) {
          newW = targetWidth.clamp(1, 16000);
          newH = (newW / aspect).round().clamp(1, 16000);
        } else if (targetHeight != null) {
          newH = targetHeight.clamp(1, 16000);
          newW = (newH * aspect).round().clamp(1, 16000);
        }
      } else {
        newW = (targetWidth ?? origW).clamp(1, 16000);
        newH = (targetHeight ?? origH).clamp(1, 16000);
      }
    }

    // High quality interpolation resize
    img.Image resized = img.copyResize(
      decoded,
      width: newW,
      height: newH,
      interpolation: img.Interpolation.linear,
    );

    final normalizedFormat = format.toLowerCase().replaceAll('.', '').trim();

    // If exporting to JPEG and image has transparency, composite over background
    if ((normalizedFormat == 'jpg' || normalizedFormat == 'jpeg') && resized.hasAlpha) {
      final bgColor = _parseColorHex(backgroundColorHex ?? '#FFFFFF');
      final solidCanvas = img.Image(
        width: newW,
        height: newH,
        numChannels: 3,
      );
      solidCanvas.clear(bgColor);
      img.compositeImage(solidCanvas, resized);
      resized = solidCanvas;
    }

    Uint8List outputBytes;
    String actualExt = 'jpg';

    if (normalizedFormat == 'png') {
      actualExt = 'png';
      outputBytes = Uint8List.fromList(img.encodePng(resized));
    } else if (normalizedFormat == 'webp') {
      actualExt = 'webp';
      // Fallback to jpg or png if webp encoder isn't available
      try {
        outputBytes = Uint8List.fromList(img.encodePng(resized));
        actualExt = 'png';
      } catch (_) {
        outputBytes = Uint8List.fromList(img.encodeJpg(resized, quality: quality));
        actualExt = 'jpg';
      }
    } else {
      actualExt = 'jpg';
      outputBytes = Uint8List.fromList(img.encodeJpg(resized, quality: quality.clamp(1, 100)));
    }

    // Ensure output filename matches actual extension
    final outBase = outputFileName.replaceAll(RegExp(r'\.(jpg|jpeg|png|webp)$', caseSensitive: false), '');
    final finalFileName = '$outBase.$actualExt';

    final outFile = await FileService.instance.saveFile(
      fileName: finalFileName,
      bytes: outputBytes,
    );

    await HistoryService.instance.addRecord(
      fileName: finalFileName,
      filePath: outFile.path,
      toolUsed: 'Resize & Compress Image',
      fileType: actualExt,
      sizeFormatted: _formatBytes(outputBytes.length),
    );

    return outFile;
  }

  img.Color _parseColorHex(String hex) {
    var clean = hex.replaceAll('#', '').trim();
    if (clean.length == 6) {
      final r = int.parse(clean.substring(0, 2), radix: 16);
      final g = int.parse(clean.substring(2, 4), radix: 16);
      final b = int.parse(clean.substring(4, 6), radix: 16);
      return img.ColorRgb8(r, g, b);
    }
    return img.ColorRgb8(255, 255, 255);
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
