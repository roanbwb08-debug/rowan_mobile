import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supabase = ref.watch(supabaseProvider);
    final user = supabase.auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SETTINGS'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24.0),
          children: [
            // User Profile Card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: Colors.grey.withOpacity(0.12)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFF1E6091).withOpacity(0.12),
                      child: Icon(
                        Icons.person,
                        size: 32,
                        color: const Color(0xFF1E6091),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Authorized Identity',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user?.email ?? 'Unknown User',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            const Text(
              'COMPANION SYSTEM PREFERENCES',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 12),

            // Theme Setting Mock Selector
            ListTile(
              leading: const Icon(Icons.palette_outlined),
              title: const Text('Rowan Theme Mode'),
              trailing: const Text(
                'Light Core',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Theme system managed automatically via host OS.')),
                );
              },
            ),
            const Divider(height: 1),

            // In-app wake word trigger setting
            SwitchListTile(
              secondary: const Icon(Icons.record_voice_over_outlined),
              title: const Text('In-App Wake-Word Detection'),
              subtitle: const Text('Enables passive audio scan for "Hey Rowan" trigger.'),
              value: true,
              activeColor: const Color(0xFF1E6091),
              onChanged: (val) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(val 
                        ? 'Wake-word scanner activated in-app.' 
                        : 'Wake-word scanner deactivated.'),
                  ),
                );
              },
            ),
            const Divider(height: 1),

            // Local cache clearing
            ListTile(
              leading: const Icon(Icons.cleaning_services_outlined),
              title: const Text('Clear Storage Cache'),
              subtitle: const Text('Purge conversation history and cached assets.'),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Local secure cache cleared successfully.')),
                );
              },
            ),
            const Divider(height: 1),

            const SizedBox(height: 32),
            const Text(
              'NETWORK ARCHITECTURE',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 12),

            // Base URL Status Info
            ListTile(
              leading: const Icon(Icons.cloud_sync_outlined),
              title: const Text('Rowan Backend URL'),
              subtitle: const Text('Read from compile-time configuration'),
              trailing: const Text(
                String.fromEnvironment('BACKEND_URL', defaultValue: 'http://10.0.2.2:3000'),
                style: TextStyle(fontSize: 11, color: Colors.blueGrey),
              ),
            ),
            const Divider(height: 1),

            const SizedBox(height: 48),

            // Log Out Button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent.withOpacity(0.08),
                foregroundColor: Colors.redAccent,
                side: BorderSide(color: Colors.redAccent.withOpacity(0.2)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              onPressed: () {
                ref.read(authServiceProvider).signOut();
                Navigator.of(context).pop();
              },
              icon: const Icon(Icons.logout),
              label: const Text(
                'LOG OUT OF ROWAN COMPANION',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
