import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/api/rowan_api_client.dart';
import '../../auth/providers/auth_provider.dart';

class DevicePairingScreen extends ConsumerStatefulWidget {
  const DevicePairingScreen({super.key});

  @override
  ConsumerState<DevicePairingScreen> createState() => _DevicePairingScreenState();
}

class _DevicePairingScreenState extends ConsumerState<DevicePairingScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _isScanning = true;
  bool _isProcessing = false;
  String? _statusMessage;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _processQrCode(String rawValue) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _isScanning = false;
      _statusMessage = 'Parsing QR code payload...';
    });

    try {
      final decoded = jsonDecode(rawValue);
      if (decoded is Map &&
          decoded['protocol'] == 'rowan_pairing_v1' &&
          decoded.containsKey('sessionId')) {
        final sessionId = decoded['sessionId'].toString();
        await _confirmPairing(sessionId);
      } else {
        setState(() {
          _isProcessing = false;
          _isScanning = true;
          _statusMessage = 'Invalid QR protocol. Must be rowan_pairing_v1.';
        });
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _isScanning = true;
        _statusMessage = 'Failed to parse QR code format.';
      });
    }
  }

  Future<void> _confirmPairing(String sessionId) async {
    setState(() {
      _statusMessage = 'Connecting with session $sessionId...';
    });

    try {
      final apiClient = ref.read(apiClientProvider);

      // 1. Notify the backend we scanned the pairing code
      await apiClient.post('/api/devices/pairing/scan', {
        'sessionId': sessionId,
      });

      // 2. Send the confirmation payload
      final response = await apiClient.post('/api/devices/pairing/confirm', {
        'sessionId': sessionId,
        'deviceName': 'Mobile Device Companion',
        'platform': Theme.of(context).platform == TargetPlatform.iOS ? 'iOS' : 'Android',
        'deviceInstallationId': 'mobile-${DateTime.now().millisecondsSinceEpoch}',
        'capabilities': ['MICROPHONE', 'NOTIFICATIONS'],
        'permissions': {
          'MICROPHONE': 'PROMPTED',
          'NOTIFICATIONS': 'PROMPTED',
        },
      });

      if (response.statusCode == 200) {
        setState(() {
          _isProcessing = false;
          _statusMessage = 'Pairing completed successfully!';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Device paired successfully!')),
          );
          Future.delayed(const Duration(seconds: 1), () {
            if (mounted) Navigator.of(context).pop(true);
          });
        }
      } else {
        setState(() {
          _isProcessing = false;
          _isScanning = true;
          _statusMessage = 'Pairing failed: ${response.body}';
        });
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _isScanning = true;
        _statusMessage = 'Error during pairing: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PAIR DEVICE NODE'),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _scannerController.torchState,
              builder: (context, state, child) {
                switch (state) {
                  case TorchState.off:
                    return const Icon(Icons.flash_off, color: Colors.grey);
                  case TorchState.on:
                    return const Icon(Icons.flash_on, color: Colors.yellow);
                }
              },
            ),
            onPressed: () => _scannerController.toggleTorch(),
          ),
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _scannerController.cameraFacingState,
              builder: (context, state, child) {
                switch (state) {
                  case CameraFacing.front:
                    return const Icon(Icons.camera_front);
                  case CameraFacing.back:
                    return const Icon(Icons.camera_rear);
                }
              },
            ),
            onPressed: () => _scannerController.switchCamera(),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              flex: 3,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  if (_isScanning)
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: (capture) {
                        final List<Barcode> barcodes = capture.barcodes;
                        for (final barcode in barcodes) {
                          if (barcode.rawValue != null) {
                            _processQrCode(barcode.rawValue!);
                            break;
                          }
                        }
                      },
                    )
                  else
                    Container(
                      color: Colors.black.withOpacity(0.8),
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                  // Visual Overlay/Scanner Frame
                  Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFF1E6091), width: 3),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 1,
              child: Container(
                padding: const EdgeInsets.all(24.0),
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Position the QR code inside the box',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _statusMessage ?? 'Scan a Rowan Core system pairing code to register this device.',
                      style: TextStyle(
                        fontSize: 13,
                        color: _statusMessage != null ? const Color(0xFF1E6091) : Colors.grey,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (!_isScanning && !_isProcessing) ...[
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _isScanning = true;
                            _statusMessage = null;
                          });
                        },
                        child: const Text('Try Again'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
