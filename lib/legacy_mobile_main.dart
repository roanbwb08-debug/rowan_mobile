import 'package:flutter/material.dart';
import 'core/auth/auth_controller.dart';
import 'core/theme/rowan_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    final auth = await AuthController.create();
    runApp(RowanApp(auth: auth));
  } on Object catch (error) {
    runApp(ConfigurationErrorApp(message: error.toString()));
  }
}

class ConfigurationErrorApp extends StatelessWidget {
  const ConfigurationErrorApp({required this.message, super.key});
  final String message;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Rowan configuration error',
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: SelectableText(message, textAlign: TextAlign.center),
            ),
          ),
        ),
      );
}

class RowanApp extends StatelessWidget {
  const RowanApp({required this.auth, super.key});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: auth,
      builder: (context, _) => MaterialApp(
        title: 'Rowan',
        debugShowCheckedModeBanner: false,
        theme: RowanTheme.light,
        darkTheme: RowanTheme.dark,
        themeMode: ThemeMode.system,
        home: auth.isAuthenticated
            ? HomeScreen(auth: auth)
            : LoginScreen(auth: auth),
      ),
    );
  }
}