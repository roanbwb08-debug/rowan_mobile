import 'package:flutter/foundation.dart';

/// Centralized configuration helper for Rowan Mobile client.
/// Reads configuration passed via --dart-define flags or environment defaults.
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: String.fromEnvironment(
      'VITE_SUPABASE_URL',
      defaultValue: 'https://hmxcmabaksskjjsbylws.supabase.co',
    ),
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: String.fromEnvironment(
      'VITE_SUPABASE_ANON_KEY',
      defaultValue: 'sb_publishable_46-DkUPTM9hGpAiUBpbSJw_CjU9CrTM',
    ),
  );

  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'https://ais-dev-dbnaawdtjsq3njql2j2tar-863840080199.europe-west2.run.app',
  );

  /// Local development fallback for Android emulator testing.
  static const String localEmulatorFallbackUrl = 'http://10.0.2.2:3000';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty &&
      !supabaseUrl.contains('placeholder-project') &&
      supabaseAnonKey.isNotEmpty;
}
