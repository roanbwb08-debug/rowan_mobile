import 'package:flutter/material.dart';

enum RowanModuleId { omni, live, sanctuary, titan, developer }

class RowanModule {
  final RowanModuleId id;
  final String name;
  final String description;
  final IconData icon;
  final Color accentColor;

  const RowanModule({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    this.accentColor = const Color(0xFF00F0FF),
  });

  static List<RowanModule> get registry => [
        const RowanModule(
          id: RowanModuleId.omni,
          name: 'OMNI',
          description: 'General intelligence & reasoning',
          icon: Icons.auto_awesome,
        ),
        const RowanModule(
          id: RowanModuleId.live,
          name: 'LIVE',
          description: 'Real-time web research & analysis',
          icon: Icons.language,
          accentColor: Colors.greenAccent,
        ),
        const RowanModule(
          id: RowanModuleId.sanctuary,
          name: 'SANCTUARY',
          description: 'Privacy-first personal data vault',
          icon: Icons.shield,
          accentColor: Colors.purpleAccent,
        ),
        const RowanModule(
          id: RowanModuleId.titan,
          name: 'TITAN',
          description: 'High-performance compute & creative engine',
          icon: Icons.bolt,
          accentColor: Colors.orangeAccent,
        ),
        const RowanModule(
          id: RowanModuleId.developer,
          name: 'DEVELOPER',
          description: 'Advanced coding & system engineering',
          icon: Icons.code,
          accentColor: Colors.blueAccent,
        ),
      ];
}
