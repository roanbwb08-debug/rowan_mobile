import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/rowan_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../../chat/ui/chat_screen.dart';
import '../../connections/ui/connection_center_screen.dart';
import '../../pairing/ui/device_pairing_screen.dart';
import '../../settings/ui/settings_screen.dart';
import '../../voice/ui/live_mode_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  RowanAvatarState _avatarState = RowanAvatarState.idle;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final userEmail = authState.value?.session?.user.email ?? 'Connected Partner';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'ROWAN SYSTEM CORE',
          style: TextStyle(
            letterSpacing: 2,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'System Settings',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              
              // Greeting Section
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Welcome back,',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    userEmail.split('@')[0],
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Dynamic Expressive Avatar Interactive Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.grey.withOpacity(0.12)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 28.0, horizontal: 20.0),
                  child: Column(
                    children: [
                      // Large interactive avatar
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _avatarState = RowanAvatarState.thinking;
                          });
                          Future.delayed(const Duration(milliseconds: 1500), () {
                            if (mounted) {
                              setState(() {
                                _avatarState = RowanAvatarState.idle;
                              });
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => const LiveModeScreen()),
                              );
                            }
                          });
                        },
                        child: RowanExpressiveAvatar(
                          state: _avatarState,
                          size: 150,
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Rowan Core Mascot',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.1,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Tap to initiate Voice Mode session',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Core Status Chip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.emerald.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.emerald.withOpacity(0.2), width: 0.5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.emerald,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'COGNITIVE NODE SYNCHRONIZED',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.emerald[800],
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Primary Actions Bento Grid
              const Text(
                'COMPANION UTILITIES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Colors.grey,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 12),

              // Action Shortcuts Grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 0.88,
                children: [
                  _ShortcutCard(
                    icon: Icons.chat_bubble_outline,
                    title: 'Chat Assistant',
                    description: 'Ask Rowan anything, share images, or get responses.',
                    color: const Color(0xFF1E6091),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ChatScreen()),
                      );
                    },
                  ),
                  _ShortcutCard(
                    icon: Icons.mic_none_outlined,
                    title: 'Live Voice',
                    description: 'Direct audio channel with automatic VAD interaction.',
                    color: Colors.teal,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const LiveModeScreen()),
                      );
                    },
                  ),
                  _ShortcutCard(
                    icon: Icons.hub_outlined,
                    title: 'Connection Center',
                    description: 'Manage paired terminals and integrated websites.',
                    color: Colors.indigo,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ConnectionCenterScreen()),
                      );
                    },
                  ),
                  _ShortcutCard(
                    icon: Icons.qr_code_scanner_outlined,
                    title: 'Pair Device Node',
                    description: 'Scan Rowan Core QR code to register companion hardware.',
                    color: Colors.purple,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const DevicePairingScreen()),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShortcutCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final VoidCallback onTap;

  const _ShortcutCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.grey.withOpacity(0.12)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.1,
                ),
              ),
              const SizedBox(height: 4),
              Expanded(
                child: Text(
                  description,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
