import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/rowan_theme.dart';
import 'features/auth/ui/login_screen.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/home/ui/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    runApp(const ConfigurationErrorApp());
    return;
  }

  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);

  runApp(const ProviderScope(child: RowanMobileApp()));
}

class ConfigurationErrorApp extends StatelessWidget {
  const ConfigurationErrorApp({super.key});

  @override
  Widget build(BuildContext context) => const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Rowan Mobile is not configured. Provide SUPABASE_URL and SUPABASE_ANON_KEY with --dart-define.',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
}

class RowanMobileApp extends ConsumerWidget {
  const RowanMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return MaterialApp(
      title: 'Rowan AI',
      theme: RowanTheme.lightTheme,
      darkTheme: RowanTheme.darkTheme,
      themeMode: ThemeMode.system, // Support light/dark mode natively
      debugShowCheckedModeBanner: false,
      home: authState.when(
        data: (state) {
          final session = state.session;
          if (session != null) {
            return const HomeScreen(); // Navigate to the Rowan Dashboard first
          }
          return const LoginScreen();
        },
        loading: () => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
        error: (err, stack) => Scaffold(
          body: Center(
            child: Text('Authentication Error: $err'),
          ),
        ),
      ),
    );
  }
}
