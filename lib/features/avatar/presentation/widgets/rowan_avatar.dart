import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/rowan_state_provider.dart';
import '../../domain/models/rowan_state.dart';
import '../../../../core/theme/app_colors.dart';

class RowanAvatar extends ConsumerWidget {
  final double size;
  const RowanAvatar({super.key, this.size = 180});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rowanState = ref.watch(rowanStateProvider);
    
    return Stack(
      alignment: Alignment.center,
      children: [
        // Glow Effect
        _AvatarGlow(status: rowanState.status, size: size),
        
        // The core avatar (using the logo asset)
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: _getStatusColor(rowanState.status).withValues(alpha: 0.3),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: ClipOval(
            child: Image.asset(
              'assets/logo.png',
              fit: BoxFit.cover,
            ),
          ),
        ),
        
        // Status Overlay (e.g. listening indicator)
        if (rowanState.status == RowanStatus.listening)
           const _ListeningRing(),
      ],
    );
  }

  Color _getStatusColor(RowanStatus status) {
    return switch (status) {
      RowanStatus.idle => AppColors.primaryBlue,
      RowanStatus.listening => AppColors.cyan,
      RowanStatus.thinking => AppColors.primaryBlue,
      RowanStatus.searching => Colors.greenAccent,
      RowanStatus.creating => Colors.orangeAccent,
      RowanStatus.speaking => AppColors.lightCyan,
      RowanStatus.error => AppColors.error,
    };
  }
}

class _AvatarGlow extends StatefulWidget {
  final RowanStatus status;
  final double size;
  const _AvatarGlow({required this.status, required this.size});

  @override
  State<_AvatarGlow> createState() => _AvatarGlowState();
}

class _AvatarGlowState extends State<_AvatarGlow> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        double scale = 1.0 + (_controller.value * 0.15);
        if (widget.status == RowanStatus.thinking) {
           scale = 1.1 + (_controller.value * 0.2);
        }
        
        return Container(
          width: widget.size * scale,
          height: widget.size * scale,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                _getStatusColor(widget.status).withValues(alpha: 0.4),
                Colors.transparent,
              ],
            ),
          ),
        );
      },
    );
  }

  Color _getStatusColor(RowanStatus status) {
    return switch (status) {
      RowanStatus.idle => AppColors.primaryBlue,
      RowanStatus.listening => AppColors.cyan,
      RowanStatus.thinking => AppColors.primaryBlue,
      RowanStatus.searching => Colors.greenAccent,
      RowanStatus.creating => Colors.orangeAccent,
      RowanStatus.speaking => AppColors.lightCyan,
      RowanStatus.error => AppColors.error,
    };
  }
}

class _ListeningRing extends StatelessWidget {
  const _ListeningRing();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      height: 200,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        valueColor: AlwaysStoppedAnimation<Color>(AppColors.cyan.withValues(alpha: 0.5)),
      ),
    );
  }
}
