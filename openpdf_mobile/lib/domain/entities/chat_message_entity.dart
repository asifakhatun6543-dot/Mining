/// Represents an AI document conversation message
class ChatMessageEntity {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String? documentCitation;
  final List<String>? actionSuggestions;

  const ChatMessageEntity({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.documentCitation,
    this.actionSuggestions,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'isUser': isUser,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'documentCitation': documentCitation,
      'actionSuggestions': actionSuggestions,
    };
  }

  factory ChatMessageEntity.fromJson(Map<String, dynamic> map) {
    return ChatMessageEntity(
      id: map['id'] as String,
      text: map['text'] as String,
      isUser: map['isUser'] as bool? ?? false,
      timestamp: DateTime.fromMillisecondsSinceEpoch(map['timestamp'] as int),
      documentCitation: map['documentCitation'] as String?,
      actionSuggestions: (map['actionSuggestions'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
    );
  }
}
