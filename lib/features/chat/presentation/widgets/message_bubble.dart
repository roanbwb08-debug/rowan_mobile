import 'package:flutter/material.dart';
import '../../domain/models/chat_message.dart';
import '../../../../core/theme/app_colors.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  const MessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isAssistant = message.role == MessageRole.assistant;
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 16.0),
      child: Column(
        crossAxisAlignment: isAssistant ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          Row(
            mainAxisAlignment: isAssistant ? MainAxisAlignment.start : MainAxisAlignment.end,
            children: [
              if (isAssistant) ...[
                 const Icon(Icons.bolt, size: 16, color: AppColors.cyan),
                 const SizedBox(width: 8),
                 Text('ROWAN AI', style: TextStyle(color: AppColors.cyan, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
              ] else ...[
                 Text('YOU', style: TextStyle(color: AppColors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(12),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
            decoration: BoxDecoration(
              color: isAssistant ? AppColors.surface : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16).copyWith(
                topLeft: isAssistant ? const Radius.circular(0) : const Radius.circular(16),
                topRight: !isAssistant ? const Radius.circular(0) : const Radius.circular(16),
              ),
              border: Border.all(color: AppColors.border, width: 0.5),
            ),
            child: Text(
              message.content,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 15, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
