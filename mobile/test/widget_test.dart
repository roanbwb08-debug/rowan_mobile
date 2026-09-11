import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:rowan_mobile/core/widgets/rowan_avatar.dart';
import 'package:rowan_mobile/features/connections/ui/connection_center_screen.dart';

void main() {
  group('Rowan Mobile - Core Architecture Tests', () {
    test('ConnectionItem model properties and copyWith state transitions', () {
      final item = ConnectionItem(
        id: 'test_id_99',
        name: 'Sandbox Test Integration',
        category: 'Automation',
        description: 'Simulating automation trigger pipeline.',
        state: ConnectionState.notConnected,
      );

      expect(item.id, 'test_id_99');
      expect(item.name, 'Sandbox Test Integration');
      expect(item.category, 'Automation');
      expect(item.state, ConnectionState.notConnected);

      // Verify state transition with copyWith
      final updatedItem = item.copyWith(state: ConnectionState.connected);
      expect(updatedItem.state, ConnectionState.connected);
      expect(updatedItem.name, 'Sandbox Test Integration'); // should remain same
    });

    test('Pairing QR Protocol validation and parsing', () {
      const qrPayload = '{"protocol": "rowan_pairing_v1", "sessionId": "sess_abc123"}';
      
      final decoded = jsonDecode(qrPayload);
      expect(decoded is Map, isTrue);
      expect(decoded['protocol'], 'rowan_pairing_v1');
      expect(decoded['sessionId'], 'sess_abc123');

      // Invalid QR payload format checks
      const invalidPayload = '{"protocol": "invalid_protocol", "sessionId": "123"}';
      final decodedInvalid = jsonDecode(invalidPayload);
      expect(decodedInvalid['protocol'] == 'rowan_pairing_v1', isFalse);
    });

    test('Rowan Avatar state mappings', () {
      const stateIdle = RowanAvatarState.idle;
      const stateListening = RowanAvatarState.listening;
      const stateThinking = RowanAvatarState.thinking;

      expect(stateIdle.toString(), contains('idle'));
      expect(stateListening.toString(), contains('listening'));
      expect(stateThinking.toString(), contains('thinking'));
    });
  });
}
