import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:printing/printing.dart';
import '../../domain/entities/document_entity.dart';

/// OpenPDF Studio - Centralized File Management Service
/// Android Storage Access Framework (SAF) & Scoped Storage Compliant.
class FileService {
  FileService._();
  static final FileService instance = FileService._();

  /// Picks a single PDF document from Android Storage
  Future<DocumentEntity?> pickPdfFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final path = file.path ?? await _cacheFile(file.name, file.bytes!);
        return DocumentEntity(
          id: 'doc_${DateTime.now().millisecondsSinceEpoch}',
          name: file.name,
          path: path,
          sizeInBytes: file.size,
          lastModified: DateTime.now(),
        );
      }
    } catch (e) {
      // Handled gracefully without crash
    }
    return null;
  }

  /// Picks multiple PDF documents (for Merge PDF)
  Future<List<DocumentEntity>> pickMultiplePdfFiles() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
        allowMultiple: true,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final list = <DocumentEntity>[];
        for (final file in result.files) {
          final path = file.path ?? await _cacheFile(file.name, file.bytes!);
          list.add(DocumentEntity(
            id: 'doc_${DateTime.now().millisecondsSinceEpoch}_${list.length}',
            name: file.name,
            path: path,
            sizeInBytes: file.size,
            lastModified: DateTime.now(),
          ));
        }
        return list;
      }
    } catch (e) {
      // Return empty list
    }
    return [];
  }

  /// Picks one or more images (JPG, PNG, WebP)
  Future<List<File>> pickImages() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
        allowMultiple: true,
      );
      if (result != null) {
        return result.paths.whereType<String>().map((p) => File(p)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Picks a Microsoft Word document (.docx, .doc, .rtf)
  Future<DocumentEntity?> pickWordFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['docx', 'doc', 'rtf'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final path = file.path ?? await _cacheFile(file.name, file.bytes!);
        return DocumentEntity(
          id: 'doc_${DateTime.now().millisecondsSinceEpoch}',
          name: file.name,
          path: path,
          sizeInBytes: file.size,
          lastModified: DateTime.now(),
        );
      }
    } catch (_) {}
    return null;
  }

  /// Picks a Microsoft Excel spreadsheet (.xlsx, .xls, .csv)
  Future<DocumentEntity?> pickExcelFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls', 'csv'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final path = file.path ?? await _cacheFile(file.name, file.bytes!);
        return DocumentEntity(
          id: 'doc_${DateTime.now().millisecondsSinceEpoch}',
          name: file.name,
          path: path,
          sizeInBytes: file.size,
          lastModified: DateTime.now(),
        );
      }
    } catch (_) {}
    return null;
  }

  /// Picks a PowerPoint presentation (.pptx, .ppt)
  Future<DocumentEntity?> pickPowerPointFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pptx', 'ppt'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final path = file.path ?? await _cacheFile(file.name, file.bytes!);
        return DocumentEntity(
          id: 'doc_${DateTime.now().millisecondsSinceEpoch}',
          name: file.name,
          path: path,
          sizeInBytes: file.size,
          lastModified: DateTime.now(),
        );
      }
    } catch (_) {}
    return null;
  }

  /// Saves processed bytes to the application documents or cache directory
  Future<File> saveFile({
    required String fileName,
    required Uint8List bytes,
    bool isTemporary = false,
  }) async {
    final dir = isTemporary
        ? await getTemporaryDirectory()
        : await getApplicationDocumentsDirectory();

    final file = File('${dir.path}/$fileName');
    await file.writeAsBytes(bytes, flush: true);

    // If saving non-temporary file on Android, also attempt to export to public Downloads folder
    if (!isTemporary && Platform.isAndroid) {
      try {
        final publicDownloadDir = Directory('/storage/emulated/0/Download');
        if (publicDownloadDir.existsSync()) {
          final publicFile = File('${publicDownloadDir.path}/$fileName');
          await publicFile.writeAsBytes(bytes, flush: true);
          return publicFile;
        }
      } catch (_) {
        // Scoped storage fallback to app directory
      }
    }

    return file;
  }

  /// Explicitly exports file bytes to public Downloads folder (/storage/emulated/0/Download)
  Future<File> exportToPublicDownloads({
    required String fileName,
    required Uint8List bytes,
  }) async {
    if (Platform.isAndroid) {
      try {
        final publicDownloadDir = Directory('/storage/emulated/0/Download');
        if (!publicDownloadDir.existsSync()) {
          publicDownloadDir.createSync(recursive: true);
        }
        final publicFile = File('${publicDownloadDir.path}/$fileName');
        await publicFile.writeAsBytes(bytes, flush: true);
        if (await publicFile.exists() && await publicFile.length() > 0) {
          return publicFile;
        }
      } catch (_) {}
    }

    // Secondary fallback using path_provider getDownloadsDirectory or getExternalStorageDirectory
    try {
      final extDir = await getExternalStorageDirectory();
      if (extDir != null) {
        final extFile = File('${extDir.path}/$fileName');
        await extFile.writeAsBytes(bytes, flush: true);
        return extFile;
      }
    } catch (_) {}

    return saveFile(fileName: fileName, bytes: bytes);
  }

  /// Allows user to choose a custom save location via Android Storage Access Framework
  Future<String?> saveFileWithPicker({
    required String fileName,
    required Uint8List bytes,
  }) async {
    try {
      final String? path = await FilePicker.platform.saveFile(
        dialogTitle: 'Save Processed Document',
        fileName: fileName,
        bytes: bytes,
      );
      if (path != null) {
        final f = File(path);
        if (!await f.exists()) {
          await f.writeAsBytes(bytes, flush: true);
        }
        return path;
      }
    } catch (_) {}
    return null;
  }

  /// Shares a document file via Android native share sheet intent
  Future<void> shareFile(String filePath, {String? subject}) async {
    try {
      final xFile = XFile(filePath);
      await Share.shareXFiles([xFile], subject: subject);
    } catch (_) {}
  }

  /// Prints a document file via Android native printing spooler
  Future<void> printDocument({required String filePath, String? docName}) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        final bytes = await file.readAsBytes();
        await Printing.layoutPdf(
          onLayout: (_) async => bytes,
          name: docName ?? 'Document.pdf',
        );
      }
    } catch (_) {}
  }

  /// Cleans up temporary processing cache directory
  Future<void> clearCache() async {
    try {
      final tempDir = await getTemporaryDirectory();
      if (tempDir.existsSync()) {
        tempDir.deleteSync(recursive: true);
      }
    } catch (_) {}
  }

  Future<String> _cacheFile(String name, Uint8List bytes) async {
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/$name');
    await file.writeAsBytes(bytes);
    return file.path;
  }
}
