import 'package:flutter/material.dart';
import '../../core/auth/auth_controller.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({required this.auth, super.key});
  final AuthController auth;
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Settings')), body: ListView(padding: const EdgeInsets.all(18), children: [ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.account_circle_outlined), title: Text(auth.user?.email ?? 'Unauthenticated session'), subtitle: Text(auth.isConfigured ? 'Supabase session' : 'Authentication is not configured')), const Divider(), ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.cloud_outlined), title: const Text('Backend'), subtitle: Text(const String.fromEnvironment('BACKEND_URL', defaultValue: 'Not configured')),), const SizedBox(height: 18), FilledButton.tonalIcon(onPressed: () => auth.signOut(), icon: const Icon(Icons.logout), label: const Text('Log out'))]));
}