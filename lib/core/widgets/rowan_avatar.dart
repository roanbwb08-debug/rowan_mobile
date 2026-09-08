import 'package:flutter/material.dart';
import '../theme/rowan_theme.dart';

class RowanAvatar extends StatelessWidget {
  const RowanAvatar({this.size = 56, super.key});
  final double size;
  @override
  Widget build(BuildContext context) => Container(width: size, height: size, decoration: const BoxDecoration(shape: BoxShape.circle, color: RowanTheme.teal), child: Icon(Icons.auto_awesome, color: Colors.white, size: size * .48));
}