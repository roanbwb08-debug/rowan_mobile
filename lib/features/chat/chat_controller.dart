import 'package:flutter/foundation.dart';
import '../../core/api/api_client.dart';
import 'message.dart';

class ChatController extends ChangeNotifier {
  ChatController(this.api);
  final RowanApiClient api;
  final messages = <ChatMessage>[];
  bool loading = false;
  String? error;

  Future<void> send(String text) async {
    if (text.trim().isEmpty || loading) return;
    messages.add(ChatMessage(text: text.trim(), fromRowan: false));
    loading = true;
    error = null;
    notifyListeners();
    try {
      final response = await api.chat(text.trim());
      final answer = response['message'] ?? response['response'] ?? response['text'];
      if (answer is! String || answer.isEmpty) throw const ApiException('The backend returned no chat message.');
      messages.add(ChatMessage(text: answer, fromRowan: true));
    } on Object catch (exception) {
      error = exception.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}