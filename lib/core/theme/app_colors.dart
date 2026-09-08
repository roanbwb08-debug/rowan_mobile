import 'package:flutter/material.dart';

class AppColors {
  // Brand Colors derived from the Rowan AI logo
  static const Color primaryBlue = Color(0xFF0057FF);
  static const Color deepBlue = Color(0xFF003199);
  static const Color cyan = Color(0xFF00F0FF);
  static const Color lightCyan = Color(0xFFA1F8FF);
  static const Color glow = Color(0xFF00F0FF);

  // Surface & Background
  static const Color background = Color(0xFF020408);
  static const Color surface = Color(0xFF0B0F17);
  static const Color surfaceElevated = Color(0xFF161C26);
  
  // Text
  static const Color textPrimary = Color(0xFFF5F5F7);
  static const Color textSecondary = Color(0xFF8E97A4);
  
  // Semantic
  static const Color border = Color(0xFF1E2633);
  static const Color success = Color(0xFF00D68F);
  static const Color warning = Color(0xFFFFAB00);
  static const Color error = Color(0xFFFF3D71);
  
  // Glow Gradient
  static const Gradient rowanGlowGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryBlue, cyan],
  );
}
