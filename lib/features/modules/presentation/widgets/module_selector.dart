import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/module_provider.dart';
import '../../domain/models/rowan_module.dart';
import '../../../../core/theme/app_colors.dart';

class ModuleSelector extends ConsumerWidget {
  const ModuleSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeModule = ref.watch(moduleProvider);
    final modules = RowanModule.registry;

    return Container(
      height: 60,
      margin: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppColors.border),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: modules.length,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        itemBuilder: (context, index) {
          final module = modules[index];
          final isSelected = activeModule.id == module.id;

          return GestureDetector(
            onTap: () => ref.read(moduleProvider.notifier).state = module,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? module.accentColor.withValues(alpha: 0.1) : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Icon(
                    module.icon,
                    size: 18,
                    color: isSelected ? module.accentColor : AppColors.textSecondary,
                  ),
                  if (isSelected) ...[
                    const SizedBox(width: 8),
                    Text(
                      module.name,
                      style: TextStyle(
                        color: module.accentColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
