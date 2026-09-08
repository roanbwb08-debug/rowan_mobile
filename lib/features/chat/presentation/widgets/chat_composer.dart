import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../modules/presentation/providers/module_provider.dart';
import '../../domain/models/chat_message.dart';
import '../providers/chat_provider.dart';
import '../../../research/presentation/research_controller.dart';

class ChatComposer extends ConsumerStatefulWidget {
  const ChatComposer({super.key});

  @override
  ConsumerState<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends ConsumerState<ChatComposer> {
  final TextEditingController _controller = TextEditingController();

  bool _isTextEmpty = true;
  bool _isResearching = false;

  @override
  void initState() {
    super.initState();

    _controller.addListener(() {
      if (!mounted) return;

      setState(() {
        _isTextEmpty = _controller.text.trim().isEmpty;
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final query = _controller.text.trim();

    if (query.isEmpty || _isResearching) return;

    final chat = ref.read(chatProvider.notifier);

    // Add the user's message immediately.
    chat.addMessage(
      ChatMessage(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        content: query,
        role: MessageRole.user,
      ),
    );

    _controller.clear();

    setState(() {
      _isResearching = true;
    });

    try {
      final controller = ref.read(researchControllerProvider.notifier);

      await controller.search(query);

      final result = ref.read(researchControllerProvider);

      result.when(
        data: (data) {
          if (data == null) {
            chat.addMessage(
              ChatMessage(
                id: DateTime.now().microsecondsSinceEpoch.toString(),
                content: 'Rowan did not receive a research result.',
                role: MessageRole.assistant,
                isError: true,
              ),
            );
            return;
          }

          final success = data['success'] == true;

          if (!success) {
            chat.addMessage(
              ChatMessage(
                id: DateTime.now().microsecondsSinceEpoch.toString(),
                content: data['error']?.toString() ??
                    'The research request failed.',
                role: MessageRole.assistant,
                isError: true,
              ),
            );
            return;
          }

          final answer = data['answer']?.toString() ??
              'Research completed, but no answer was returned.';

          final citations = <String>[];

          final results = data['results'];

          if (results is List) {
            for (final item in results) {
              if (item is Map && item['url'] != null) {
                citations.add(item['url'].toString());
              }
            }
          }

          chat.addMessage(
            ChatMessage(
              id: DateTime.now().microsecondsSinceEpoch.toString(),
              content: answer,
              role: MessageRole.assistant,
              citations: citations.isEmpty ? null : citations,
            ),
          );
        },
        loading: () {},
        error: (error, stackTrace) {
          chat.addMessage(
            ChatMessage(
              id: DateTime.now().microsecondsSinceEpoch.toString(),
              content: 'Research failed: $error',
              role: MessageRole.assistant,
              isError: true,
            ),
          );
        },
      );
    } catch (e) {
      chat.addMessage(
        ChatMessage(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          content: 'Research failed: $e',
          role: MessageRole.assistant,
          isError: true,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isResearching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeModule = ref.watch(moduleProvider);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(
            color: AppColors.border,
            width: 0.5,
          ),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              onPressed: () {},
              icon: const Icon(
                Icons.add_circle_outline,
                color: AppColors.textSecondary,
              ),
            ),

            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.border,
                  ),
                ),
                child: TextField(
                  controller: _controller,
                  maxLines: 4,
                  minLines: 1,
                  enabled: !_isResearching,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: _isResearching
                        ? 'Rowan is researching...'
                        : 'Ask Rowan AI...',
                    hintStyle: const TextStyle(
                      color: AppColors.textSecondary,
                    ),
                    border: InputBorder.none,
                  ),
                ),
              ),
            ),

            const SizedBox(width: 8),

            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _isResearching
                  ? Container(
                key: const ValueKey('loading'),
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surfaceElevated,
                  border: Border.all(
                    color: AppColors.cyan,
                  ),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(13),
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                  ),
                ),
              )
                  : _isTextEmpty
                  ? Container(
                key: const ValueKey('mic'),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.surfaceElevated,
                  border: Border.all(
                    color: AppColors.border,
                  ),
                ),
                child: IconButton(
                  onPressed: () {},
                  icon: const Icon(
                    Icons.mic,
                    color: AppColors.cyan,
                  ),
                ),
              )
                  : Container(
                key: const ValueKey('send'),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: activeModule.accentColor,
                ),
                child: IconButton(
                  onPressed: _sendMessage,
                  icon: const Icon(
                    Icons.arrow_upward,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}