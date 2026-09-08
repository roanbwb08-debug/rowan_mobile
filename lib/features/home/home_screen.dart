import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/widgets/rowan_avatar.dart';
import '../chat/chat_screen.dart';
import '../connections/connections_screen.dart';
import '../pairing/pairing_screen.dart';
import '../settings/settings_screen.dart';
import '../voice/voice_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({required this.auth, super.key});
  final AuthController auth;
  RowanApiClient get api => RowanApiClient(baseUrl: const String.fromEnvironment('BACKEND_URL'), accessToken: auth.session?.accessToken);
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 32),
            children: [
              Row(children: [const RowanAvatar(), const SizedBox(width: 14), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Your Rowan space', style: Theme.of(context).textTheme.labelLarge), Text('Good to see you${auth.user?.email == null ? '' : ', ${auth.user!.email!.split('@').first}'}', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700))])), IconButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SettingsScreen(auth: auth))), icon: const Icon(Icons.settings_outlined), tooltip: 'Settings')]),
              const SizedBox(height: 28),
              Card(
                color: Theme.of(context).colorScheme.primaryContainer,
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('One Rowan Core', style: Theme.of(context).textTheme.labelLarge),
                      const SizedBox(height: 8),
                      Text('Think, speak, and connect from one place.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 18),
                      FilledButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(api: api))), icon: const Icon(Icons.forum_outlined), label: const Text('Start a conversation')),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text('Your tools', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              _ActionTile(icon: Icons.graphic_eq, title: 'Live Voice', detail: 'Talk with Rowan in realtime', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VoiceScreen(api: api)))),
              _ActionTile(icon: Icons.forum_outlined, title: 'Chat', detail: 'Think together with Rowan', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(api: api)))),
              _ActionTile(icon: Icons.hub_outlined, title: 'Connections', detail: 'See what Rowan can reach', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ConnectionsScreen(api: api)))),
              _ActionTile(icon: Icons.qr_code_scanner, title: 'Pair a device', detail: 'Connect a Rowan device securely', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PairingScreen(api: api)))),
            ],
          ),
        ),
      );
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.icon, required this.title, required this.detail, required this.onTap});
  final IconData icon; final String title; final String detail; final VoidCallback onTap;
  @override Widget build(BuildContext context) => Card(child: ListTile(contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8), leading: CircleAvatar(child: Icon(icon)), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(detail), trailing: const Icon(Icons.arrow_forward), onTap: onTap));
}