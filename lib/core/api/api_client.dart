import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class RowanApiClient {
  RowanApiClient({required this.baseUrl, required this.accessToken, http.Client? client}) : _client = client ?? http.Client();
  final String baseUrl;
  final String? accessToken;
  final http.Client _client;

  Future<Map<String, dynamic>> chat(String message) => _post('/api/chat', {'message': message});
  Future<Map<String, dynamic>> research(String query) => _post('/api/research', {'query': query});
  Future<Map<String, dynamic>> createVoiceSession() => _post('/api/voice/session', {});
  Future<Map<String, dynamic>> pairDevice(String pairingCode) => _post('/api/pairing', {'code': pairingCode});
  Future<Map<String, dynamic>> connections() => _get('/api/connections');

  Future<Map<String, dynamic>> _get(String path) async {
    final response = await _client.get(_uri(path), headers: _headers);
    return _decode(response);
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final response = await _client.post(_uri(path), headers: {..._headers, 'Content-Type': 'application/json'}, body: jsonEncode(body));
    return _decode(response);
  }

  Uri _uri(String path) => Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}$path');

  Map<String, String> get _headers => {
        if (accessToken != null && accessToken!.isNotEmpty) 'Authorization': 'Bearer $accessToken',
        'Accept': 'application/json',
      };

  Map<String, dynamic> _decode(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = {'message': response.body};
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(body is Map && body['message'] is String ? body['message'] as String : 'Rowan backend request failed.', statusCode: response.statusCode);
    }
    return body is Map<String, dynamic> ? body : {'data': body};
  }
}