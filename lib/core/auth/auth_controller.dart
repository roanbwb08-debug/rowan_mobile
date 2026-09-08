import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthConfigurationException implements Exception {
  const AuthConfigurationException(this.message);
  final String message;
  @override
  String toString() => message;
}

class AuthController extends ChangeNotifier {
  AuthController._(this._client);
  final SupabaseClient? _client;
  Session? get session => _client?.auth.currentSession;
  User? get user => session?.user;
  bool get isAuthenticated => session != null;
  bool get isConfigured => _client != null;

  static Future<AuthController> create() async {
    const url = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
    const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY', defaultValue: '');
    final missing = <String>[
      if (url.isEmpty) 'SUPABASE_URL',
      if (key.isEmpty) 'SUPABASE_PUBLISHABLE_KEY',
    ];
    if (missing.isNotEmpty) {
      throw AuthConfigurationException(
        'Missing Supabase configuration: ${missing.join(', ')}. '
        'Run with --dart-define-from-file=.env or provide both --dart-define values.',
      );
    }
    await Supabase.initialize(url: url, publishableKey: key);
    final controller = AuthController._(Supabase.instance.client);
    controller._client!.auth.onAuthStateChange.listen((_) => controller.notifyListeners());
    return controller;
  }

  Future<void> signIn(String email, String password) async {
    final client = _client;
    if (client == null) throw const AuthException('Supabase is not configured.');
    await client.auth.signInWithPassword(email: email, password: password);
    notifyListeners();
  }

  Future<AuthResponse> signUp(String email, String password) async {
    final client = _client;
    if (client == null) throw const AuthException('Supabase is not configured.');
    final response = await client.auth.signUp(email: email, password: password).timeout(
      const Duration(seconds: 30),
      onTimeout: () => throw const AuthException('Supabase signup timed out. Check the Auth email provider and try again.'),
    );
    notifyListeners();
    return response;
  }

  Future<void> resendConfirmation(String email) async {
    final client = _client;
    if (client == null) throw const AuthException('Supabase is not configured.');
    await client.auth.resend(type: OtpType.signup, email: email);
  }

  Future<void> signOut() async {
    await _client?.auth.signOut();
    notifyListeners();
  }
}