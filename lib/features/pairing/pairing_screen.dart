import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api/api_client.dart';

class PairingScreen extends StatefulWidget {
  const PairingScreen({required this.api, super.key});
  final RowanApiClient api;
  @override State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  bool submitting = false;
  String? result;
  Future<void> pair(String code) async {
    if (submitting) return;
    setState(() { submitting = true; result = null; });
    try { await widget.api.pairDevice(code); setState(() => result = 'Device paired successfully.'); } catch (exception) { setState(() => result = exception.toString()); }
    setState(() => submitting = false);
  }
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Pair a device')),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: SizedBox(
                  height: 300,
                  child: MobileScanner(onDetect: (capture) {
                    final code = capture.barcodes.firstOrNull?.rawValue;
                    if (code != null) pair(code);
                  }),
                ),
              ),
              const SizedBox(height: 18),
              const Text('Scan a pairing QR code from a Rowan device.'),
              if (submitting) const Padding(padding: EdgeInsets.all(18), child: CircularProgressIndicator()),
              if (result != null) Padding(padding: const EdgeInsets.all(18), child: Text(result!, textAlign: TextAlign.center)),
            ],
          ),
        ),
      );
}