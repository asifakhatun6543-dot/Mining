import 'dart:typed_data';

/// Represents a document loaded into OpenPDF Studio
class DocumentEntity {
  final String id;
  final String name;
  final String path;
  final int sizeInBytes;
  final int pageCount;
  final DateTime lastModified;
  final Uint8List? thumbnailBytes;

  const DocumentEntity({
    required this.id,
    required this.name,
    required this.path,
    required this.sizeInBytes,
    this.pageCount = 1,
    required this.lastModified,
    this.thumbnailBytes,
  });

  String get formattedSize {
    if (sizeInBytes < 1024) return '$sizeInBytes B';
    if (sizeInBytes < 1024 * 1024) return '${(sizeInBytes / 1024).toStringAsFixed(1)} KB';
    if (sizeInBytes < 1024 * 1024 * 1024) return '${(sizeInBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(sizeInBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  String get fileExtension {
    final idx = name.lastIndexOf('.');
    if (idx != -1 && idx < name.length - 1) {
      return name.substring(idx + 1).toLowerCase();
    }
    return 'pdf';
  }
}
