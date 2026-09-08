import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:rowan_mobile/core/api/api_client.dart';
import 'package:rowan_mobile/core/auth/auth_controller.dart';
import 'package:rowan_mobile/core/widgets/rowan_avatar.dart';

class _FakeClient extends http.BaseClient {
  http.Request? request;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest baseRequest) async {
    request = baseRequest as http.Request;
    return http.StreamedResponse(Stream.value(utf8.encode(jsonEncode({'message': 'connected'}))), 200, headers: {'content-type': 'application/json'});
  }
}

void main() {
  testWidgets('Rowan avatar is rendered', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: RowanAvatar())));
    expect(find.byIcon(Icons.auto_awesome), findsOneWidget);
  });

  test('missing Supabase configuration fails clearly', () async {
    expect(
      () => AuthController.create(),
      throwsA(isA<AuthConfigurationException>()),
    );
  });

  test('API client sends backend URL and bearer token', () async {
    final client = _FakeClient();
    final api = RowanApiClient(baseUrl: 'https://rowan.example/', accessToken: 'token-123', client: client);
    await api.chat('hello');
    expect(client.request?.url.toString(), 'https://rowan.example/api/chat');
    expect(client.request?.headers['authorization'], 'Bearer token-123');
  });
}