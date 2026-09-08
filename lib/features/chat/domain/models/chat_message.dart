enum MessageRole { user, assistant, system }

class ChatMessage {
  final String id;
  final String content;
  final MessageRole role;
  final DateTime timestamp;
  final bool isError;
  final List<String>? citations;

  ChatMessage({
    required this.id,
    required this.content,
    required this.role,
    DateTime? timestamp,
    this.isError = false,
    this.citations,
  }) : timestamp = timestamp ?? DateTime.now();
}
