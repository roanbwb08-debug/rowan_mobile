import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import 'chat_controller.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({required this.api, super.key});
  final RowanApiClient api;
  @override State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final ChatController controller;
  final composer = TextEditingController();
  @override void initState() { super.initState(); controller = ChatController(widget.api); controller.addListener(_changed); }
  void _changed() => setState(() {});
  @override void dispose() { controller.removeListener(_changed); controller.dispose(); composer.dispose(); super.dispose(); }
  Future<void> send() async { final text = composer.text; composer.clear(); await controller.send(text); }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Chat')), body: Column(children: [Expanded(child: controller.messages.isEmpty ? const Center(child: Text('Start a conversation with Rowan.')) : ListView.builder(padding: const EdgeInsets.all(18), itemCount: controller.messages.length, itemBuilder: (_, index) => _Bubble(message: controller.messages[index]))), if (controller.error != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 18), child: Text(controller.error!, style: TextStyle(color: Theme.of(context).colorScheme.error))), if (controller.loading) const LinearProgressIndicator(minHeight: 2), SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(14, 8, 14, 10), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [Expanded(child: TextField(controller: composer, minLines: 1, maxLines: 5, decoration: const InputDecoration(hintText: 'Message Rowan'))), const SizedBox(width: 8), IconButton.filled(onPressed: controller.loading ? null : send, icon: const Icon(Icons.arrow_upward), tooltip: 'Send')])))]));
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final dynamic message;
  @override Widget build(BuildContext context) => Align(alignment: message.fromRowan ? Alignment.centerLeft : Alignment.centerRight, child: Container(constraints: const BoxConstraints(maxWidth: 330), margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11), decoration: BoxDecoration(color: message.fromRowan ? Theme.of(context).colorScheme.surfaceContainerHighest : Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(16)), child: Text(message.text)));
}