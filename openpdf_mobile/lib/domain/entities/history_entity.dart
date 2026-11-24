/// Represents a persistent document history record
class HistoryEntity {
  final String id;
  final String fileName;
  final String? filePath;
  final String toolUsed;
  final String fileType; // 'pdf', 'docx', 'xlsx', 'pptx', 'ai', 'image'
  final String sizeFormatted;
  final DateTime timestamp;
  final String status; // 'completed', 'in_progress', 'failed'
  final bool isFavorite;

  const HistoryEntity({
    required this.id,
    required this.fileName,
    this.filePath,
    required this.toolUsed,
    required this.fileType,
    required this.sizeFormatted,
    required this.timestamp,
    this.status = 'completed',
    this.isFavorite = false,
  });

  HistoryEntity copyWith({
    String? id,
    String? fileName,
    String? filePath,
    String? toolUsed,
    String? fileType,
    String? sizeFormatted,
    DateTime? timestamp,
    String? status,
    bool? isFavorite,
  }) {
    return HistoryEntity(
      id: id ?? this.id,
      fileName: fileName ?? this.fileName,
      filePath: filePath ?? this.filePath,
      toolUsed: toolUsed ?? this.toolUsed,
      fileType: fileType ?? this.fileType,
      sizeFormatted: sizeFormatted ?? this.sizeFormatted,
      timestamp: timestamp ?? this.timestamp,
      status: status ?? this.status,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fileName': fileName,
      'filePath': filePath,
      'toolUsed': toolUsed,
      'fileType': fileType,
      'sizeFormatted': sizeFormatted,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'status': status,
      'isFavorite': isFavorite,
    };
  }

  factory HistoryEntity.fromJson(Map<String, dynamic> map) {
    return HistoryEntity(
      id: map['id'] as String? ?? 'hist_${DateTime.now().millisecondsSinceEpoch}',
      fileName: map['fileName'] as String? ?? 'Document.pdf',
      filePath: map['filePath'] as String?,
      toolUsed: map['toolUsed'] as String? ?? 'PDF Editor',
      fileType: map['fileType'] as String? ?? 'pdf',
      sizeFormatted: map['sizeFormatted'] as String? ?? '1.0 MB',
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        map['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
      status: map['status'] as String? ?? 'completed',
      isFavorite: map['isFavorite'] as bool? ?? false,
    );
  }

  String get relativeTime {
    final diff = DateTime.now().difference(timestamp);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
  }
}
