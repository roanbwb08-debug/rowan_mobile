import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'core/config/app_config.dart';
import 'core/theme/rowan_theme.dart';
import 'features/auth/ui/login_screen.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/home/ui/home_screen.dart';
import 'features/onboarding/ui/onboarding_screen.dart';
import 'features/onboarding/ui/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  runApp(const ProviderScope(child: RowanMobileApp()));
}

class RowanMobileApp extends ConsumerStatefulWidget {
  const RowanMobileApp({super.key});

  @override
  ConsumerState<RowanMobileApp> createState() => _RowanMobileAppState();
}

class _RowanMobileAppState extends ConsumerState<RowanMobileApp> {
  bool _showSplash = true;
  bool _isOnboardingComplete = false;
  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _checkOnboardingStatus();
  }

  Future<void> _checkOnboardingStatus() async {
    try {
      final completed = await _storage.read(key: 'rowan_onboarding_completed');
      if (completed == 'true') {
        setState(() {
          _isOnboardingComplete = true;
        });
      }
    } catch (e) {
      debugPrint('[OnboardingStatus] Secure storage read notice: $e');
    }
  }

  void _onSplashFinished() {
    setState(() {
      _showSplash = false;
    });
  }

  void _onOnboardingComplete() {
    setState(() {
      _isOnboardingComplete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_showSplash) {
      return MaterialApp(
        title: 'Rowan AI',
        theme: RowanTheme.lightTheme,
        darkTheme: RowanTheme.darkTheme,
        themeMode: ThemeMode.system,
        debugShowCheckedModeBanner: false,
        home: RowanSplashScreen(onFinish: _onSplashFinished),
      );
    }

    final authState = ref.watch(authStateProvider);

    return MaterialApp(
      title: 'Rowan AI',
      theme: RowanTheme.lightTheme,
      darkTheme: RowanTheme.darkTheme,
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      home: authState.when(
        data: (state) {
          final session = state.session;
          if (session != null) {
            if (_isOnboardingComplete) {
              return const HomeScreen();
            } else {
              return OnboardingScreen(onOnboardingComplete: _onOnboardingComplete);
            }
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
