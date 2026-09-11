import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';

class ChatMessage {
  final String role;
  final String text;
  final String? imageUrl;
  ChatMessage({required this.role, required this.text, this.imageUrl});
}

class ChatState {
  final List<ChatMessage> messages;
  final bool isLoading;
  final String? error;

  ChatState({this.messages = const [], this.isLoading = false, this.error});

  ChatState copyWith({List<ChatMessage>? messages, bool? isLoading, String? error}) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  final Ref ref;
  String _sessionId = DateTime.now().millisecondsSinceEpoch.toString();

  ChatNotifier(this.ref) : super(ChatState(messages: [
    ChatMessage(role: 'assistant', text: 'Hello! I am Rowan. How can I help you today?')
  ]));

  Future<void> sendMessage(String text, {String? imagePath}) async {
    if (text.trim().isEmpty && imagePath == null) return;

    final userMessage = ChatMessage(role: 'user', text: text, imageUrl: imagePath);
    state = state.copyWith(messages: [...state.messages, userMessage], isLoading: true, error: null);

    try {
      final apiClient = ref.read(apiClientProvider);
      
      if (imagePath != null) {
        // Send image to /api/image/edit
        final response = await apiClient.postMultipart(
          '/api/image/edit',
          filePath: imagePath,
          fileField: 'image',
          fields: {'prompt': text},
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final replyText = 'Here is your edited image.';
          final imageUrl = data['imageUrl'];
          
          state = state.copyWith(
            messages: [...state.messages, ChatMessage(role: 'assistant', text: replyText, imageUrl: imageUrl)],
            isLoading: false,
          );
        } else {
          state = state.copyWith(
            isLoading: false,
            error: 'Image edit error: ${response.statusCode} - ${response.body}',
          );
        }
      } else {
        // Standard chat
        final response = await apiClient.post('/api/chat', {
          'message': text,
          'sessionId': _sessionId,
          'enableSearch': false,
          'connectionId': 'mobile-${DateTime.now().millisecondsSinceEpoch}',
        });

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final replyText = data['message'] ?? 'Received empty response from server.';
          
          state = state.copyWith(
            messages: [...state.messages, ChatMessage(role: 'assistant', text: replyText)],
            isLoading: false,
          );
        } else {
          state = state.copyWith(
            isLoading: false,
            error: 'Server error: ${response.statusCode} - ${response.body}',
          );
        }
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Network error: $e',
      );
    }
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier(ref);
});
