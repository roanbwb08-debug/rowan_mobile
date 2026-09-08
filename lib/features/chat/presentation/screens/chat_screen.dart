import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../avatar/presentation/providers/rowan_state_provider.dart';
import '../../../avatar/presentation/widgets/rowan_avatar.dart';
import '../../../modules/presentation/providers/module_provider.dart';
import '../../../modules/presentation/widgets/module_selector.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_composer.dart';
import '../widgets/message_bubble.dart';
import '../../../../core/theme/app_colors.dart';

class ChatScreen extends ConsumerWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rowanState = ref.watch(rowanStateProvider);
    final messages = ref.watch(chatProvider);
    final activeModule = ref.watch(moduleProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Glow / Ambient Effect
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: activeModule.accentColor.withValues(alpha: 0.05),
              ),
            ),
          ),

          Column(
            children: [
              // Custom Header
              _buildHeader(context, activeModule),

              // Main Content Area
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    // Avatar Area
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40.0),
                        child: Column(
                          children: [
                            const RowanAvatar(),
                            const SizedBox(height: 16),
                            Text(
                              rowanState.status.label.toUpperCase(),
                              style: TextStyle(
                                color: activeModule.accentColor,
                                letterSpacing: 4,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (rowanState.message != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Text(
                                  rowanState.message!,
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    // Module Selector
                    const SliverToBoxAdapter(
                      child: ModuleSelector(),
                    ),

                    // Messages List
                    if (messages.isEmpty)
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Text(
                            'Initialize ${activeModule.name} protocol...',
                            style: const TextStyle(color: AppColors.textSecondary, fontStyle: FontStyle.italic),
                          ),
                        ),
                      )
                    else
                      SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => MessageBubble(message: messages[index]),
                          childCount: messages.length,
                        ),
                      ),
                  ],
                ),
              ),

              // Input Composer
              const ChatComposer(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, activeModule) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ROWAN AI',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    fontSize: 18,
                  ),
                ),
                Text(
                  activeModule.name,
                  style: TextStyle(
                    color: activeModule.accentColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.settings_outlined, color: AppColors.textPrimary),
              onPressed: () => context.push('/settings'),
            ),
          ],
        ),
      ),
    );
  }
}


