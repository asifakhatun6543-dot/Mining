import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
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
        type: FileType.image,
        allowMultiple: true,
      );
      if (result != null) {
        return result.paths.whereType<String>().map((p) => File(p)).toList();
      }
    } catch (_) {}
    return [];
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
    return file;
  }

  /// Shares a document file via Android native share sheet intent
  Future<void> shareFile(String filePath, {String? subject}) async {
    try {
      final xFile = XFile(filePath);
      await Share.shareXFiles([xFile], subject: subject);
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
