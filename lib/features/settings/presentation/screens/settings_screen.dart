import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SETTINGS'),
      ),
      body: ListView(
        children: [
          _buildSectionHeader('SYSTEM'),
          _buildListTile(Icons.memory, 'AI Configuration', 'Manage LLM and research parameters'),
          _buildListTile(Icons.security, 'Privacy & Security', 'Encryption and data vault settings'),
          
          _buildSectionHeader('INTERFACE'),
          _buildListTile(Icons.palette, 'Theme', 'Futuristic AI visual parameters'),
          
          _buildSectionHeader('ABOUT'),
          _buildListTile(Icons.info_outline, 'Rowan AI Version', '1.0.0-alpha'),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.cyan,
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildListTile(IconData icon, String title, String subtitle) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textSecondary),
      title: Text(title, style: const TextStyle(color: AppColors.textPrimary)),
      subtitle: Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
      onTap: () {},
    );
  }
}
