import 'package:flutter/material.dart';

class RowanTheme {
  static const teal = Color(0xff2f8f83);
  static const coral = Color(0xffe47a61);
  static const cloud = Color(0xfff4f1ea);

  static ThemeData get light => _theme(Brightness.light, cloud);
  static ThemeData get dark => _theme(Brightness.dark, const Color(0xff111a1d));

  static ThemeData _theme(Brightness brightness, Color background) {
    final scheme = ColorScheme.fromSeed(seedColor: teal, brightness: brightness, surface: background);
    return ThemeData(useMaterial3: true, brightness: brightness, colorScheme: scheme, scaffoldBackgroundColor: background, inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(), filled: true), cardTheme: const CardThemeData(margin: EdgeInsets.zero));
  }
}