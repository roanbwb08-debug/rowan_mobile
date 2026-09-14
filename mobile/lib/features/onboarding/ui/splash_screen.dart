import 'package:flutter/material.dart';
import '../../../core/widgets/rowan_avatar.dart';

class RowanSplashScreen extends StatefulWidget {
  final VoidCallback onFinish;

  const RowanSplashScreen({
    super.key,
    required this.onFinish,
  });

  @override
  State<RowanSplashScreen> createState() => _RowanSplashScreenState();
}

class _RowanSplashScreenState extends State<RowanSplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeIn),
    );

    _fadeController.forward();

    // Hold for 2.2 seconds then exit splash
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) {
        widget.onFinish();
      }
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Premium Rowan Expressive Avatar representing Rowan Logo
              const RowanExpressiveAvatar(
                state: RowanAvatarState.idle,
                size: 160,
              ),
              const SizedBox(height: 24),
              const Text(
                'ROWAN AI',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4.0,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'ONE INTELLIGENCE. EVERYWHERE.',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
