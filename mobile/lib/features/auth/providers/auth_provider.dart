import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/api/rowan_api_client.dart';

final supabaseProvider = Provider<SupabaseClient>((ref) => Supabase.instance.client);

final authStateProvider = StreamProvider<AuthState>((ref) {
  final supabase = ref.watch(supabaseProvider);
  return supabase.auth.onAuthStateChange;
});

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(supabaseProvider));
});

final apiClientProvider = Provider<RowanApiClient>((ref) {
  return RowanApiClient(ref.watch(supabaseProvider));
});

class AuthService {
  final SupabaseClient _supabase;
  AuthService(this._supabase);

  Future<void> _ensureProfileExists(User user) async {
    try {
      await _supabase.from('profiles').upsert({
        'id': user.id,
        'email': user.email ?? '',
        'updated_at': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      print('[AuthService] Profile auto-upsert notice: $e');
    }
  }

  Future<void> signIn(String email, String password) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    if (response.user != null) {
      await _ensureProfileExists(response.user!);
    }
  }

  Future<void> signUp(String email, String password) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
    );
    if (response.user != null) {
      await _ensureProfileExists(response.user!);
    }
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
}
