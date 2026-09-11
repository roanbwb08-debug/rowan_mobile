import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class RowanApiClient {
  final String baseUrl;
  final SupabaseClient _supabase;
  final Duration timeoutDuration;

  RowanApiClient(
    this._supabase, {
    this.baseUrl = const String.fromEnvironment('BACKEND_URL', defaultValue: 'http://10.0.2.2:3000'),
    this.timeoutDuration = const Duration(seconds: 15),
  });

  Future<Map<String, String>> _getSecureHeaders({bool isMultipart = false}) async {
    final session = _supabase.auth.currentSession;
    final token = session?.accessToken;

    return {
      if (!isMultipart) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Parses error responses safely.
  String _parseError(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body.containsKey('error')) {
        return body['error'].toString();
      }
      if (body is Map && body.containsKey('message')) {
        return body['message'].toString();
      }
    } catch (_) {}
    return 'Server returned status code ${response.statusCode}';
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getSecureHeaders();
    final url = Uri.parse('$baseUrl$endpoint');
    
    // Safe Logging - No secrets or tokens logged.
    print('[RowanApiClient] POST to endpoint: $endpoint (timeout: ${timeoutDuration.inSeconds}s)');

    try {
      final response = await http
          .post(
            url,
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(timeoutDuration);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      } else {
        final errMsg = _parseError(response);
        throw Exception(errMsg);
      }
    } catch (e) {
      print('[RowanApiClient] Error during POST to $endpoint: $e');
      if (e is http.ClientException || e.toString().contains('SocketException')) {
        throw Exception('Network connection failure. Verify if backend is reachable at $baseUrl.');
      }
      rethrow;
    }
  }

  Future<http.Response> get(String endpoint) async {
    final headers = await _getSecureHeaders();
    final url = Uri.parse('$baseUrl$endpoint');

    print('[RowanApiClient] GET endpoint: $endpoint');

    try {
      final response = await http
          .get(
            url,
            headers: headers,
          )
          .timeout(timeoutDuration);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      } else {
        final errMsg = _parseError(response);
        throw Exception(errMsg);
      }
    } catch (e) {
      print('[RowanApiClient] Error during GET $endpoint: $e');
      rethrow;
    }
  }

  Future<http.Response> postMultipart(
    String endpoint, {
    required String filePath,
    required String fileField,
    required Map<String, String> fields,
  }) async {
    final headers = await _getSecureHeaders(isMultipart: true);
    final url = Uri.parse('$baseUrl$endpoint');
    
    print('[RowanApiClient] Multipart POST to: $endpoint');

    try {
      final request = http.MultipartRequest('POST', url);
      request.headers.addAll(headers);
      request.fields.addAll(fields);
      request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
      
      final streamedResponse = await request.send().timeout(timeoutDuration);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      } else {
        final errMsg = _parseError(response);
        throw Exception(errMsg);
      }
    } catch (e) {
      print('[RowanApiClient] Error during Multipart POST to $endpoint: $e');
      rethrow;
    }
  }
}
