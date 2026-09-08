import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import 'voice_realtime_service.dart';

class VoiceScreen extends StatefulWidget {
  const VoiceScreen({required this.api, super.key});
  final RowanApiClient api;
  @override
  State<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends State<VoiceScreen> {
  late final VoiceRealtimeService service;
  final logs = <String>[];
  bool loading = false;
  bool listening = false;
  String? error;

  @override
  void initState() {
    super.initState();
    service = VoiceRealtimeService(api: widget.api, onLog: _onLog);
  }

  void _onLog(String message) {
    debugPrint(message);
    if (!mounted) return;
    setState(() {
      logs.insert(0, message);
      if (message == 'VOICE: realtime connection established') listening = true;
      if (message.startsWith('VOICE: ERROR')) error = message;
    });
  }

  Future<void> start() async {
    setState(() { loading = true; error = null; });
    try {
      await service.start();
    } catch (exception) {
      _onLog('VOICE: ERROR $exception');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> stop() async {
    await service.stop();
    if (mounted) setState(() => listening = false);
  }

  @override
  void dispose() {
    service.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Live Voice')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                Icon(Icons.graphic_eq, size: 72, color: Theme.of(context).colorScheme.primary),
                const SizedBox(height: 24),
                Text(listening ? 'Listening' : 'Live Mode', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(listening ? 'Speak naturally. Rowan Core will detect your turn and respond.' : 'Create a realtime Rowan session using your microphone.'),
                const SizedBox(height: 28),
                FilledButton.icon(onPressed: loading ? null : listening ? stop : start, icon: loading ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(listening ? Icons.stop : Icons.mic), label: Text(listening ? 'Stop session' : 'Start session')),
                if (error != null) Padding(padding: const EdgeInsets.only(top: 18), child: Text(error!, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.error))),
                const SizedBox(height: 24),
                Expanded(child: Card(child: ListView.builder(reverse: true, padding: const EdgeInsets.all(12), itemCount: logs.length, itemBuilder: (_, index) => Text(logs[index], style: Theme.of(context).textTheme.bodySmall)))),
              ],
            ),
          ),
        ),
      );
}
