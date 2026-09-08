import 'package:flutter/material.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/widgets/rowan_avatar.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.auth, super.key});
  final AuthController auth;
  @override State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final confirmPassword = TextEditingController();
  String? error;
  String? notice;
  bool loading = false;
  bool creatingAccount = false;
  @override void dispose() { email.dispose(); password.dispose(); confirmPassword.dispose(); super.dispose(); }
  Future<void> submit() async {
    final normalizedEmail = email.text.trim();
    if (normalizedEmail.isEmpty || !normalizedEmail.contains('@')) {
      setState(() => error = 'Enter a valid email address.');
      return;
    }
    if (password.text.length < 6) {
      setState(() => error = 'Your password must be at least 6 characters.');
      return;
    }
    if (creatingAccount && password.text != confirmPassword.text) {
      setState(() => error = 'Passwords do not match.');
      return;
    }
    setState(() { loading = true; error = null; notice = null; });
    try {
      if (creatingAccount) {
        final response = await widget.auth.signUp(normalizedEmail, password.text);
        if (mounted && response.session == null) {
          setState(() {
            creatingAccount = false;
            notice = 'Account created. Check your email to confirm Rowan, then sign in.';
          });
        }
      } else {
        await widget.auth.signIn(normalizedEmail, password.text);
      }
    } catch (exception) {
      if (!mounted) return;
      final message = exception.toString();
      setState(() {
        if (message.contains('already registered') || message.contains('User already registered')) {
          error = 'An account with this email already exists. Sign in instead.';
          creatingAccount = false;
        } else if (message.contains('signup is disabled') || message.contains('Signups not allowed')) {
          error = 'New accounts are currently disabled in the Rowan Supabase project.';
        } else if (message.contains('email_not_confirmed') || message.contains('Email not confirmed')) {
          error = 'Please confirm your email before signing in.';
        } else if (message.contains('timed out')) {
          error = 'Supabase signup timed out. Check the Supabase Auth email provider configuration and try again.';
        } else if (message.contains('Connection timed out') || message.contains('SocketException')) {
          error = 'Rowan could not reach Supabase. Check this phone\'s internet connection, Wi-Fi, or VPN and try again.';
        } else {
          error = message;
        }
      });
    }
    if (mounted) setState(() => loading = false);
  }

  void toggleMode() {
    setState(() {
      creatingAccount = !creatingAccount;
      error = null;
      notice = null;
    });
  }

  Future<void> resendConfirmation() async {
    if (email.text.trim().isEmpty) {
      setState(() => error = 'Enter your email address first.');
      return;
    }
    setState(() { loading = true; error = null; notice = null; });
    try {
      await widget.auth.resendConfirmation(email.text.trim());
      if (mounted) setState(() => notice = 'A new confirmation email is on its way.');
    } catch (exception) {
      if (mounted) setState(() => error = exception.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const RowanAvatar(size: 72),
                    const SizedBox(height: 28),
                    Text(creatingAccount ? 'Create your Rowan account' : 'Welcome to Rowan', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text('Your authenticated window into one Rowan Core.'),
                    const SizedBox(height: 32),
                    TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                    const SizedBox(height: 14),
                    TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
                    if (creatingAccount) ...[
                      const SizedBox(height: 14),
                      TextField(controller: confirmPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password')),
                    ],
                    if (error != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
                    if (notice != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(notice!, style: TextStyle(color: Theme.of(context).colorScheme.primary))),
                    const SizedBox(height: 20),
                    SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: loading ? null : submit, icon: loading ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(creatingAccount ? Icons.person_add : Icons.login), label: Text(creatingAccount ? 'Sign up' : 'Sign in'))),
                    if (!creatingAccount) Center(child: TextButton(onPressed: loading ? null : resendConfirmation, child: const Text('Resend confirmation email'))),
                    const SizedBox(height: 10),
                    Center(child: TextButton(onPressed: loading ? null : toggleMode, child: Text(creatingAccount ? 'I already have an account' : "I don't have an account yet"))),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}